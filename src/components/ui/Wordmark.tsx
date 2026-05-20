// "Vest" + "IA" estilizado: el wordmark de la marca.
// La parte "IA" va en italica, igual que en el prototipo.

type Props = {
  className?: string;
  tone?: "default" | "inverse";
};

export default function Wordmark({ className, tone = "default" }: Props) {
  const color = tone === "inverse" ? "text-white" : "text-text";
  return (
    <span className={`font-display font-bold ${color} ${className ?? ""}`}>
      Strand<span className="italic">IA</span>
    </span>
  );
}
