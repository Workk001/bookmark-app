import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  return { title: `@${handle}'s bookmarks` };
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (!profile) notFound();

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: "600px", margin: "2rem auto", padding: "0 1rem" }}>
      <h1>@{handle}</h1>
      <p>{bookmarks?.length ?? 0} public bookmarks</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {bookmarks?.map((b) => (
          <li key={b.id} style={{ marginBottom: "1rem" }}>
            <a href={b.url} target="_blank" rel="noopener noreferrer">
              {b.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
