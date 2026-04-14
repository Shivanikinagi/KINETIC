import os, algosdk.mnemonic as m, algosdk.account as a, algosdk.v2client.algod as algod
from dotenv import load_dotenv
load_dotenv('.env')
admin=a.address_from_private_key(m.to_private_key(os.getenv('ADMIN_MNEMONIC')))
agent=a.address_from_private_key(m.to_private_key(os.getenv('AGENT_MNEMONIC')))
prov=a.address_from_private_key(m.to_private_key(os.getenv('PROVIDER_MNEMONIC')))
client=algod.AlgodClient('', 'https://testnet-api.algonode.cloud')

with open('balances.txt', 'w') as f:
    f.write(f"Admin {admin}: {client.account_info(admin).get('amount')} microAlgos\n")
    f.write(f"Agent {agent}: {client.account_info(agent).get('amount')} microAlgos\n")
    f.write(f"Provider {prov}: {client.account_info(prov).get('amount')} microAlgos\n")
    f.write("DONE\n")
