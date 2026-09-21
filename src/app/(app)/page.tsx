import { getProfile } from "@/domains/settings/services/profile-service";
import { createClient } from "@/shared/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O layout do grupo (app) já garante que `user` existe aqui.
  const profile = user ? await getProfile(supabase, user.id) : null;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        Olá{profile?.name ? `, ${profile.name}` : ""}
      </h1>
      <p className="text-muted-foreground">
        Fundação do projeto (Fase 0) concluída. A Tela Hoje completa — missões,
        prioridades e os cards de cada área — chega na Fase 1.
      </p>
    </div>
  );
}
