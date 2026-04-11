type JobCardProps = {
  title: string;
  subtitle: string;
  detail: string;
};

export default function JobCard({ title, subtitle, detail }: JobCardProps) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p className="muted">{subtitle}</p>
      <p>{detail}</p>
    </article>
  );
}
