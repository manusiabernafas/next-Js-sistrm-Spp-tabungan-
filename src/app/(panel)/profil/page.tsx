import { requireUser, LABEL_ROLE } from "@/lib/auth";
import Kepala from "@/components/kepala";
import FormSandi from "./form";

export const metadata = { title: "Profil" };

export default async function Profil() {
  const u = await requireUser();
  return (
    <>
      <Kepala judul="Profil & kata sandi" sub={`${u.nama} · ${LABEL_ROLE[u.role]} · username ${u.username}`} />
      <FormSandi />
    </>
  );
}
