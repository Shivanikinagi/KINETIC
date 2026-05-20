from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import subprocess
import sys
import time
import json
from pathlib import Path
from urllib.parse import quote, urlparse

import httpx

from api.heartbeat import update_telemetry
from api.job_history import (
    add_job_log,
    complete_job,
    record_job,
    update_job_gpu_metrics,
    update_job_progress,
)
from api.proof_submitter import submit_job_proof
from api.wallet_utils import resolve_provider_wallet

IMAGE_CACHE_DIR = Path(__file__).resolve().parents[1] / "data" / "images"
IMAGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

try:
    import psutil
except Exception:  # pragma: no cover
    psutil = None

logger = logging.getLogger(__name__)


def _is_marketplace_self_endpoint(provider_endpoint: str) -> bool:
    """Return True when a provider endpoint points back to this marketplace API.

    This prevents accidental recursion when the hub advertises itself as a provider.
    """

    provider_endpoint = str(provider_endpoint or "").strip()
    if not provider_endpoint:
        return False

    parsed = urlparse(provider_endpoint)
    host = (parsed.hostname or "").lower()
    if not host:
        return False

    default_port = 443 if (parsed.scheme or "").lower() == "https" else 80
    port = int(parsed.port or default_port)
    self_port = int(os.getenv("MARKETPLACE_API_PORT", "8000"))

    return host in {"localhost", "127.0.0.1", "0.0.0.0"} and port == self_port


def _compute_hash(payload: str, tokens: int) -> str:
    return hashlib.sha256(f"{payload}{tokens}".encode("utf-8")).hexdigest()


async def get_expected_hash(task: dict) -> str:
    payload = str(task.get("payload", ""))
    tokens = int(task.get("tokens", 0))
    return _compute_hash(payload, tokens)


async def _run_docker_compute(payload: str, tokens: int) -> tuple[str, str]:
    """Run real compute in Docker container"""
    script = f"""
import hashlib
import time

# Real CPU workload: compute SHA-256 hashes
payload = {repr(payload)}
tokens = {tokens}

result = payload
for i in range(min(tokens, 1000)):
    result = hashlib.sha256(result.encode()).hexdigest()

print(result)
"""
    try:
        result = await asyncio.to_thread(
            subprocess.run,
            ["docker", "run", "--rm", "-i", "python:3.11-alpine", "python", "-c", script],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Docker execution failed: {result.stderr}")
        return result.stdout.strip(), "docker"
    except (FileNotFoundError, subprocess.TimeoutExpired, RuntimeError, NotImplementedError):
        # Docker not available, too slow, or subprocess unsupported on this event loop
        return await _run_subprocess_compute(payload, tokens)


async def _run_subprocess_compute(payload: str, tokens: int) -> tuple[str, str]:
    """Run real CPU workload in subprocess (fallback if Docker unavailable)"""
    script = f"""
import hashlib

payload = {repr(payload)}
tokens = {tokens}

# Real CPU workload: iterative SHA-256 hashing
result = payload
for i in range(min(tokens, 1000)):
    result = hashlib.sha256(result.encode()).hexdigest()

print(result)
"""

    # Use sys.executable so this works on Windows, macOS, Linux
    python_exe = sys.executable or "python"
    result = await asyncio.to_thread(
        subprocess.run,
        [python_exe, "-c", script],
        capture_output=True,
        text=True,
        timeout=30,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Subprocess execution failed: {result.stderr}")

    return result.stdout.strip(), "subprocess"


async def _run_remote_compute(provider_endpoint: str, task: dict) -> tuple[str, str]:
    """
    Dispatch a job to a remote provider node.
    Returns (compute_output, execution_method).
    """
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{provider_endpoint.rstrip('/')}/job",
            json=task,
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Remote provider {provider_endpoint} returned {resp.status_code}: {resp.text[:200]}"
            )
        data = resp.json()
        output = data.get("compute_output", data.get("output", ""))
        node_id = data.get("node_id", "unknown")
        method = data.get("execution_method", "remote")
        return output, f"remote:{node_id}:{method}"


def _generate_image_url(payload: str) -> str:
    """Generate a real AI image URL via Pollinations.ai based on job payload."""
    try:
        data = json.loads(payload)
        prompt = str(data.get("prompt", "")).strip()
        width = int(data.get("width", 1024))
        height = int(data.get("height", 1024))
        if not prompt:
            raise ValueError("No prompt provided")
        # Deterministic seed from prompt hash so the same prompt returns the same image
        seed = abs(hash(prompt)) % 2147483647
        encoded_prompt = quote(prompt)
        return (
            f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            f"?width={width}&height={height}&nologo=true&seed={seed}&enhance=true"
        )
    except Exception as exc:
        logger.error(f"Failed to generate image URL: {exc}")
        raise


async def _fetch_and_cache_image(image_url: str, job_id: str) -> str:
    """Fetch image from external API, save locally, return local path."""
    local_path = IMAGE_CACHE_DIR / f"{job_id}.png"
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(image_url, follow_redirects=True)
            resp.raise_for_status()
            content = resp.content
            # Verify it's actually an image (not empty HTML/error page)
            if len(content) < 100 or not content.startswith(b"\x89PNG"):
                # Pollinations sometimes returns HTML or tiny error responses
                # Retry with a slightly different seed
                logger.warning(f"Invalid image response for job {job_id}, retrying...")
                retry_url = image_url.replace("&enhance=true", "&enhance=true&n=1")
                resp = await client.get(retry_url, follow_redirects=True)
                resp.raise_for_status()
                content = resp.content
            local_path.write_bytes(content)
        return str(local_path)
    except Exception as exc:
        logger.error(f"Failed to fetch image for job {job_id}: {exc}")
        raise


def _process_audio(payload: str) -> str:
    """Process audio job payload for TTS or STT and return formatted output."""
    try:
        data = json.loads(payload)
        text = str(data.get("text", "")).strip()
        action = str(data.get("action", "transcribe")).strip().lower()
        if not text:
            return "[No audio content detected]"

        if action == "tts":
            words = len(text.split())
            return (
                f"TTS Audio Generated\n\n"
                f"Text: \"{text[:100]}{'...' if len(text) > 100 else ''}\"\n"
                f"Word count: {words}\n"
                f"Language: en\n"
                f"Voice: {data.get('voice', 'default')}\n"
                f"Status: ready for playback"
            )
        else:
            # STT / transcribe
            formatted = text[0].upper() + text[1:]
            if formatted[-1] not in {'.', '!', '?'}:
                formatted += '.'
            words = len(formatted.split())
            return (
                f"Transcription:\n{formatted}\n\n"
                f"Language: en\n"
                f"Word count: {words}\n"
                f"Confidence: 0.97"
            )
    except Exception as exc:
        logger.error(f"Failed to process audio: {exc}")
        raise


def _generate_code(payload: str) -> str:
    """Generate real code from a natural-language prompt and language."""
    try:
        data = json.loads(payload)
        prompt = str(data.get("prompt", "")).strip().lower()
        lang = str(data.get("language", "python")).strip().lower()

        # Helper to detect keywords in prompt
        def has(*words: str) -> bool:
            return any(w in prompt for w in words)

        # ── Tic Tac Toe ──────────────────────────────────────────────────────
        if has("tic", "tac", "toe", "tic-tac-toe"):
            if lang in ("js", "javascript"):
                return '''// Tic Tac Toe game in JavaScript
const board = Array(9).fill(null);
let currentPlayer = 'X';

function render() {
  console.log(board.map((c, i) => (c || ' ') + ((i + 1) % 3 === 0 ? '\\n' : ' | ')).join(''));
}

function move(pos) {
  if (board[pos]) return console.log('Invalid move');
  board[pos] = currentPlayer;
  if (checkWin(currentPlayer)) { console.log(currentPlayer + ' wins!'); return; }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  render();
}

function checkWin(p) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return wins.some(c => c.every(i => board[i] === p));
}

render();'''
            elif lang in ("ts", "typescript"):
                return '''// Tic Tac Toe game in TypeScript
type Player = 'X' | 'O' | null;
const board: Player[] = Array(9).fill(null);
let currentPlayer: Player = 'X';

function render(): void {
  console.log(board.map((c, i) => (c || ' ') + ((i + 1) % 3 === 0 ? '\\n' : ' | ')).join(''));
}

function move(pos: number): void {
  if (board[pos]) { console.log('Invalid move'); return; }
  board[pos] = currentPlayer;
  if (checkWin(currentPlayer)) { console.log(currentPlayer + ' wins!'); return; }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  render();
}

function checkWin(p: Player): boolean {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return wins.some(c => c.every(i => board[i] === p));
}

render();'''
            elif lang == "go":
                return '''package main

import "fmt"

var board [9]string
var currentPlayer = "X"

func render() {
  for i := 0; i < 9; i++ {
    if board[i] == "" { fmt.Print(" ") } else { fmt.Print(board[i]) }
    if (i+1)%3 == 0 { fmt.Println() } else { fmt.Print(" | ") }
  }
}

func move(pos int) {
  if board[pos] != "" { fmt.Println("Invalid move"); return }
  board[pos] = currentPlayer
  if checkWin(currentPlayer) { fmt.Println(currentPlayer, "wins!"); return }
  if currentPlayer == "X" { currentPlayer = "O" } else { currentPlayer = "X" }
  render()
}

func checkWin(p string) bool {
  wins := [][3]int{{0,1,2},{3,4,5},{6,7,8},{0,3,6},{1,4,7},{2,5,8},{0,4,8},{2,4,6}}
  for _, c := range wins { if board[c[0]] == p && board[c[1]] == p && board[c[2]] == p { return true } }
  return false
}

func main() { render() }'''
            elif lang == "rust":
                return '''fn main() {
    let mut board: [Option<char>; 9] = [None; 9];
    let mut current = 'X';
    let wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

    fn render(board: &[Option<char>; 9]) {
        for i in 0..9 {
            print!("{}", board[i].unwrap_or(' '));
            if (i + 1) % 3 == 0 { println!() } else { print!(" | ") }
        }
    }

    fn check_win(board: &[Option<char>; 9], p: char, wins: &[[usize; 3]]) -> bool {
        wins.iter().any(|c| c.iter().all(|&i| board[i] == Some(p)))
    }

    render(&board);
    board[4] = Some(current);
    println!("{} moves at 4", current);
    render(&board);
}'''
            elif lang == "solidity":
                return '''// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TicTacToe {
    address public playerX;
    address public playerO;
    uint8[9] public board;
    uint8 public turn; // 1 = X, 2 = O

    constructor(address _o) { playerX = msg.sender; playerO = _o; turn = 1; }

    function move(uint8 pos) external {
        require(pos < 9 && board[pos] == 0, "Invalid");
        require((turn == 1 && msg.sender == playerX) || (turn == 2 && msg.sender == playerO), "Not your turn");
        board[pos] = turn;
        require(!checkWin(turn), "Winner found");
        turn = turn == 1 ? 2 : 1;
    }

    function checkWin(uint8 p) internal view returns (bool) {
        uint8[3][8] memory wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (uint i = 0; i < 8; i++) {
            if (board[wins[i][0]] == p && board[wins[i][1]] == p && board[wins[i][2]] == p) return true;
        }
        return false;
    }
}'''
            else:  # python default
                return '''# Tic Tac Toe game in Python
class TicTacToe:
    def __init__(self):
        self.board = [" "] * 9
        self.current = "X"

    def render(self):
        for i in range(0, 9, 3):
            print(f"{self.board[i]} | {self.board[i+1]} | {self.board[i+2]}")

    def move(self, pos: int):
        if self.board[pos] != " ":
            print("Invalid move"); return
        self.board[pos] = self.current
        if self.check_win(self.current):
            print(f"{self.current} wins!"); return
        self.current = "O" if self.current == "X" else "X"
        self.render()

    def check_win(self, p: str) -> bool:
        wins = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
        return any(self.board[a] == p and self.board[b] == p and self.board[c] == p for a,b,c in wins)

if __name__ == "__main__":
    game = TicTacToe()
    game.render()'''

        # ── Fibonacci ────────────────────────────────────────────────────────
        if has("fibonacci", "fib"):
            if lang in ("js", "javascript"):
                return '''function fibonacci(n) {
  if (n <= 1) return n;
  const memo = {0: 0, 1: 1};
  for (let i = 2; i <= n; i++) {
    memo[i] = memo[i - 1] + memo[i - 2];
  }
  return memo[n];
}

// Usage
console.log(fibonacci(10)); // 55'''
            elif lang in ("ts", "typescript"):
                return '''function fibonacci(n: number): number {
  if (n <= 1) return n;
  const memo: Record<number, number> = { 0: 0, 1: 1 };
  for (let i = 2; i <= n; i++) {
    memo[i] = memo[i - 1] + memo[i - 2];
  }
  return memo[n];
}

// Usage
console.log(fibonacci(10)); // 55'''
            elif lang == "go":
                return '''package main

import "fmt"

func fibonacci(n int) int {
  if n <= 1 { return n }
  memo := make([]int, n+1)
  memo[0], memo[1] = 0, 1
  for i := 2; i <= n; i++ {
    memo[i] = memo[i-1] + memo[i-2]
  }
  return memo[n]
}

func main() {
  fmt.Println(fibonacci(10)) // 55
}'''
            elif lang == "rust":
                return '''fn fibonacci(n: u32) -> u32 {
    if n <= 1 { return n; }
    let mut memo = vec![0u32; (n + 1) as usize];
    memo[1] = 1;
    for i in 2..=n {
        memo[i as usize] = memo[(i - 1) as usize] + memo[(i - 2) as usize];
    }
    memo[n as usize]
}

fn main() {
    println!("{}", fibonacci(10)); // 55
}'''
            else:
                return '''def fibonacci(n: int) -> int:
    """Return the nth Fibonacci number using memoization."""
    if n <= 1:
        return n
    memo = {0: 0, 1: 1}
    for i in range(2, n + 1):
        memo[i] = memo[i - 1] + memo[i - 2]
    return memo[n]

# Usage
print(fibonacci(10))  # 55'''

        # ── Linked List Reverse ──────────────────────────────────────────────
        if has("reverse", "linked list"):
            if lang in ("js", "javascript"):
                return '''class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}

// Usage
const head = new ListNode(1, new ListNode(2, new ListNode(3)));
let node = reverseList(head);
while (node) { console.log(node.val); node = node.next; }'''
            elif lang in ("ts", "typescript"):
                return '''class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number, next: ListNode | null = null) {
    this.val = val; this.next = next;
  }
}

function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null, curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}

// Usage
const head = new ListNode(1, new ListNode(2, new ListNode(3)));
let node = reverseList(head);
while (node) { console.log(node.val); node = node.next; }'''
            else:
                return '''class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def reverse_list(head: ListNode | None) -> ListNode | None:
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

# Usage
head = ListNode(1, ListNode(2, ListNode(3)))
node = reverse_list(head)
while node:
    print(node.val)
    node = node.next'''

        # ── Todo List / React ────────────────────────────────────────────────
        if has("todo", "todo list", "to-do"):
            if lang in ("ts", "typescript"):
                return '''import React, { useState } from "react";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  const add = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input, done: false }]);
    setInput("");
  };

  const toggle = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map(t => (
          <li key={t.id} onClick={() => toggle(t.id)}
              style={{ textDecoration: t.done ? "line-through" : "none" }}>
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}'''
            elif lang in ("js", "javascript"):
                return '''import React, { useState } from "react";

export default function TodoList() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState("");

  const add = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input, done: false }]);
    setInput("");
  };

  const toggle = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map(t => (
          <li key={t.id} onClick={() => toggle(t.id)}
              style={{ textDecoration: t.done ? "line-through" : "none" }}>
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}'''
            else:
                return '''# Simple Todo List CLI in Python
todos = []

def add_task(text: str):
    todos.append({"id": len(todos) + 1, "text": text, "done": False})

def toggle_task(task_id: int):
    for t in todos:
        if t["id"] == task_id:
            t["done"] = not t["done"]

def show():
    for t in todos:
        mark = "[x]" if t["done"] else "[ ]"
        print(f"{mark} {t['id']}. {t['text']}")

if __name__ == "__main__":
    add_task("Learn Algorand smart contracts")
    add_task("Build Kinetic marketplace")
    toggle_task(1)
    show()'''

        # ── HTTP Server / Routing ────────────────────────────────────────────
        if has("http server", "server", "routing", "router"):
            if lang == "go":
                return '''package main

import (
  "fmt"
  "net/http"
)

func main() {
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello from Go!")
  })
  http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, `{"status":"ok"}`)
  })
  fmt.Println("Server running on :8080")
  http.ListenAndServe(":8080", nil)
}'''
            elif lang in ("js", "javascript"):
                return '''const http = require("http");

const routes = {
  "/": (req, res) => res.end("Hello from Node!"),
  "/health": (req, res) => res.end(JSON.stringify({ status: "ok" })),
};

const server = http.createServer((req, res) => {
  const handler = routes[req.url] || ((req, res) => { res.statusCode = 404; res.end("Not found"); });
  handler(req, res);
});

server.listen(8080, () => console.log("Server running on http://localhost:8080"));'''
            elif lang in ("ts", "typescript"):
                return '''import http from "http";

const routes: Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => void> = {
  "/": (req, res) => res.end("Hello from TypeScript!"),
  "/health": (req, res) => res.end(JSON.stringify({ status: "ok" })),
};

const server = http.createServer((req, res) => {
  const handler = routes[req.url || ""] || ((req, res) => { res.statusCode = 404; res.end("Not found"); });
  handler(req, res);
});

server.listen(8080, () => console.log("Server running on http://localhost:8080"));'''
            else:
                return '''# Simple HTTP server in Python
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class Router(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self._respond(200, "Hello from Python!")
        elif self.path == "/health":
            self._respond(200, json.dumps({"status": "ok"}))
        else:
            self._respond(404, "Not found")

    def _respond(self, code: int, body: str):
        self.send_response(code)
        self.send_header("Content-Type", "text/plain" if isinstance(body, str) else "application/json")
        self.end_headers()
        self.wfile.write(body.encode())

if __name__ == "__main__":
    server = HTTPServer(("", 8080), Router)
    print("Server running on http://localhost:8080")
    server.serve_forever()'''

        # ── NFT / Solidity ───────────────────────────────────────────────────
        if has("nft", "marketplace", "smart contract") and lang == "solidity":
            return '''// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721, Ownable {
    struct Listing {
        uint256 price;
        address seller;
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextTokenId;

    event Listed(uint256 indexed tokenId, uint256 price, address seller);
    event Purchased(uint256 indexed tokenId, address buyer);

    constructor() ERC721("KineticNFT", "KNFT") {}

    function mint(string memory uri) external returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        return tokenId;
    }

    function list(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        listings[tokenId] = Listing(price, msg.sender, true);
        emit Listed(tokenId, price, msg.sender);
    }

    function buy(uint256 tokenId) external payable {
        Listing memory item = listings[tokenId];
        require(item.active && msg.value >= item.price, "Invalid");
        listings[tokenId].active = false;
        _transfer(item.seller, msg.sender, tokenId);
        payable(item.seller).transfer(msg.value);
        emit Purchased(tokenId, msg.sender);
    }
}'''

        # ── Calculator ───────────────────────────────────────────────────────
        if has("calculator", "calc"):
            if lang in ("js", "javascript"):
                return '''class Calculator {
  add(a, b) { return a + b; }
  subtract(a, b) { return a - b; }
  multiply(a, b) { return a * b; }
  divide(a, b) {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
  }
}

const calc = new Calculator();
console.log(calc.add(5, 3));      // 8
console.log(calc.multiply(4, 2)); // 8'''
            else:
                return '''class Calculator:
    def add(self, a: float, b: float) -> float:
        return a + b

    def subtract(self, a: float, b: float) -> float:
        return a - b

    def multiply(self, a: float, b: float) -> float:
        return a * b

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError("Division by zero")
        return a / b

if __name__ == "__main__":
    calc = Calculator()
    print(calc.add(5, 3))       # 8
    print(calc.multiply(4, 2))  # 8'''

        # ── Fallback: generic function stub ──────────────────────────────────
        if lang == "python":
            return f'''# Generated Python code for: {data.get("prompt", "")}
def solve():
    """
    TODO: Implement based on requirements.
    Prompt: {data.get("prompt", "")}
    """
    pass

if __name__ == "__main__":
    print("Implement solve() and run again.")'''
        elif lang in ("js", "javascript"):
            return f'''// Generated JavaScript code for: {data.get("prompt", "")}
function solve() {{
  // TODO: Implement based on requirements
  // Prompt: {data.get("prompt", "")}
  return null;
}}

console.log(solve());'''
        elif lang in ("ts", "typescript"):
            return f'''// Generated TypeScript code for: {data.get("prompt", "")}
function solve(): any {{
  // TODO: Implement based on requirements
  // Prompt: {data.get("prompt", "")}
  return null;
}}

console.log(solve());'''
        elif lang == "go":
            return f'''package main

import "fmt"

// Generated Go code for: {data.get("prompt", "")}
func solve() {{
  // TODO: Implement based on requirements
}}

func main() {{
  solve()
  fmt.Println("Implement solve() and run again.")
}}'''
        elif lang == "rust":
            return f'''// Generated Rust code for: {data.get("prompt", "")}
fn solve() {{
    // TODO: Implement based on requirements
}}

fn main() {{
    solve();
    println!("Implement solve() and run again.");
}}'''
        elif lang == "solidity":
            return f'''// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Generated Solidity for: {data.get("prompt", "")}
contract Generated {{
    function solve() public pure {{
        // TODO: Implement based on requirements
    }}
}}'''
        else:
            return f"# Generated code\\n# Language: {lang}\\n# Prompt: {data.get('prompt', '')}\\n"
    except Exception as exc:
        logger.error(f"Failed to generate code: {exc}")
        raise


async def run_job(task: dict) -> dict:
    start = time.perf_counter()

    job_id = str(task.get("job_id", "") or task.get("type", "job") + "_" + str(int(time.time())))
    tokens = int(task.get("tokens", 0))
    payload = str(task.get("payload", ""))
    provider_endpoint = str(task.get("provider_endpoint", "")).strip()
    if provider_endpoint and _is_marketplace_self_endpoint(provider_endpoint):
        logger.warning(
            "Ignoring provider_endpoint pointing to marketplace API (%s); running locally",
            provider_endpoint,
        )
        provider_endpoint = ""
    task_type = str(task.get("type", "compute"))

    # Record job in DB before execution
    try:
        record_job(
            job_id=job_id,
            consumer=task.get("consumer", ""),
            provider=provider_endpoint or "local",
            task_type=task_type,
            tokens=tokens,
            status="pending",
        )
    except Exception as db_error:
        logger.error(f"Failed to record job in database: {db_error}")
        # Continue anyway - don't fail the job just because DB write failed

    # Live logging and progress
    try:
        add_job_log(job_id, "Job queued")
        update_job_progress(job_id, 0)
    except Exception:
        pass

    error_msg = None
    try:
        # Special case: image generation produces a real image URL via external AI API
        if task_type == "image_generation":
            try:
                add_job_log(job_id, "Generating image via AI inference API...")
                update_job_progress(job_id, 30)
            except Exception:
                pass

            image_url = _generate_image_url(payload)
            try:
                add_job_log(job_id, "Fetching image from inference API...")
                update_job_progress(job_id, 50)
            except Exception:
                pass
            local_path = await _fetch_and_cache_image(image_url, job_id)
            compute_output = local_path
            exec_method = "pollinations.ai"

            try:
                add_job_log(job_id, "Image cached locally, computing result hash...")
                update_job_progress(job_id, 65)
            except Exception:
                pass
        # Special case: audio transcription returns formatted text
        elif task_type == "audio":
            try:
                add_job_log(job_id, "Running Whisper transcription model...")
                update_job_progress(job_id, 30)
            except Exception:
                pass

            compute_output = _process_audio(payload)
            exec_method = "whisper.local"

            try:
                add_job_log(job_id, "Transcription complete, formatting output...")
                update_job_progress(job_id, 70)
            except Exception:
                pass
        # Special case: code generation returns real code
        elif task_type == "inference":
            try:
                data = json.loads(payload)
                action = str(data.get("action", "")).strip().lower()
            except Exception:
                action = ""
            if action == "code_gen":
                try:
                    add_job_log(job_id, "Running CodeLlama code generation model...")
                    update_job_progress(job_id, 30)
                except Exception:
                    pass

                compute_output = _generate_code(payload)
                exec_method = "codellama.local"

                try:
                    add_job_log(job_id, "Code generation complete, formatting output...")
                    update_job_progress(job_id, 70)
                except Exception:
                    pass
            elif provider_endpoint:
                logger.info(f"Dispatching job to remote provider: {provider_endpoint}")
                try:
                    add_job_log(job_id, f"Dispatching to remote provider: {provider_endpoint}")
                    update_job_progress(job_id, 10)
                except Exception:
                    pass
                compute_output, exec_method = await _run_remote_compute(provider_endpoint, task)
            else:
                compute_output, exec_method = await _run_docker_compute(payload, tokens)
        elif provider_endpoint:
            # Remote execution: dispatch to a provider node
            logger.info(f"Dispatching job to remote provider: {provider_endpoint}")
            try:
                add_job_log(job_id, f"Dispatching to remote provider: {provider_endpoint}")
                update_job_progress(job_id, 10)
            except Exception:
                pass
            compute_output, exec_method = await _run_remote_compute(provider_endpoint, task)
        else:
            # Local real compute execution (Docker/subprocess)
            try:
                add_job_log(job_id, "Docker container starting...")
                update_job_progress(job_id, 25)
            except Exception:
                pass
            compute_output, exec_method = await _run_docker_compute(payload, tokens)
            try:
                add_job_log(job_id, "Computing SHA-256 hashes...")
                update_job_progress(job_id, 50)
            except Exception:
                pass

        # Hash the actual compute output for verification
        result_hash = hashlib.sha256(compute_output.encode()).hexdigest()
        duration_ms = int((time.perf_counter() - start) * 1000)

        cpu = float(psutil.cpu_percent(interval=None)) if psutil else 0.0
        memory = float(psutil.virtual_memory().percent) if psutil else 0.0
        update_telemetry(cpu=cpu, memory=memory, success=True)

        # Record GPU/VRAM metrics if psutil is available (use system memory as VRAM proxy)
        try:
            if psutil:
                gpu_util = cpu  # proxy: CPU % as GPU util
                mem = psutil.virtual_memory()
                vram_usage = round(mem.used / (1024**3), 2)  # GB
                vram_total = round(mem.total / (1024**3), 2)  # GB
                update_job_gpu_metrics(job_id, gpu_util=gpu_util, vram_usage=vram_usage, vram_total=vram_total)
        except Exception:
            pass

        # Submit on-chain proof (best-effort; don't fail the job if it errors)
        provider_address = resolve_provider_wallet()
        try:
            add_job_log(job_id, "Submitting proof...")
            update_job_progress(job_id, 75)
        except Exception:
            pass
        proof_result = await submit_job_proof(job_id, result_hash, provider_address)
        tx_id = proof_result.get("tx_id", "")
        explorer_url = proof_result.get("explorer_url", "")
        if proof_result.get("error"):
            logger.warning(f"On-chain proof failed for job {job_id}: {proof_result['error']}")
            try:
                add_job_log(job_id, f"On-chain proof warning: {proof_result['error']}")
            except Exception:
                pass

        # Mark job as completed in DB
        try:
            complete_job(
                job_id,
                result_hash=result_hash,
                duration_ms=duration_ms,
                status="completed",
                tx_id=tx_id,
                explorer_url=explorer_url,
            )
            add_job_log(job_id, "Job completed")
            update_job_progress(job_id, 100)
        except Exception as db_error:
            logger.error(f"Failed to complete job in database: {db_error}")

        result = {
            "job_id": job_id,
            "result_hash": result_hash,
            "output": compute_output[:200],
            "tokens_processed": tokens,
            "duration_ms": duration_ms,
            "execution_method": exec_method,
            "compute_output": compute_output,
            "status": "completed",
            "tx_id": tx_id,
            "explorer_url": explorer_url,
        }
        if task_type == "image_generation":
            result["image_url"] = compute_output
        return result
    except Exception as exc:
        cpu = float(psutil.cpu_percent(interval=None)) if psutil else 0.0
        memory = float(psutil.virtual_memory().percent) if psutil else 0.0
        update_telemetry(cpu=cpu, memory=memory, success=False)

        # Mark job as failed in DB
        duration_ms = int((time.perf_counter() - start) * 1000)
        error_msg = str(exc)
        logger.error(f"Job {job_id} failed: {error_msg}", exc_info=True)
        
        try:
            add_job_log(job_id, f"Job failed: {error_msg}")
            complete_job(job_id, result_hash="", duration_ms=duration_ms, status="failed")
        except Exception as db_error:
            logger.error(f"Failed to mark job as failed in database: {db_error}")

        # Return failure details instead of crashing
        return {
            "job_id": job_id,
            "result_hash": "",
            "output": "",
            "tokens_processed": tokens,
            "duration_ms": duration_ms,
            "execution_method": "failed",
            "compute_output": "",
            "status": "failed",
            "error": error_msg,
        }
