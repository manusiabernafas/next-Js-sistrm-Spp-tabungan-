import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/setting";
import Kepala from "@/components/kepala";
import FormPengaturan from "./form";

export const metadata = { title: "Pengaturan" };

export default async function Pengaturan() {
  await requireUser("admin");
  const s = await getSetting();
  return (
    <>
      <Kepala judul="Pengaturan" sub="Identitas sekolah, jatuh tempo, dan pesan pengingat" />
      <FormPengaturan s={s} />
    </>
  );
}
