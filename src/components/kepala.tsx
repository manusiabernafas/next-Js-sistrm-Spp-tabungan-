export default function Kepala({ judul, sub, children }: { judul: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="kepala">
      <div><h1>{judul}</h1>{sub ? <p>{sub}</p> : null}</div>
      {children ? <div className="baris no-print">{children}</div> : null}
    </div>
  );
}
