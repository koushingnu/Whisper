import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// 用語を追加する関数
async function addGlossaryTerm(
  term: string,
  description: string,
  category?: string
) {
  console.log("Adding glossary term:", { term, description, category });

  const { data, error } = await supabase
    .from("glossary")
    .insert({
      term,
      description,
      category,
    })
    .select();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }

  console.log("Successfully added term:", data);
  return data;
}

// 用語を検索する関数
async function searchGlossaryTerms(query?: string, category?: string) {
  let queryBuilder = supabase
    .from("glossary")
    .select("*")
    .order("term", { ascending: true });

  if (query) {
    queryBuilder = queryBuilder.ilike("term", `%${query}%`);
  }

  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("Supabase select error:", error);
    throw error;
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const { term, description, category } = await request.json();
    console.log("Received glossary term:", { term, description, category });

    if (!term || !description) {
      return new Response(JSON.stringify({ error: "用語と説明は必須です" }), {
        status: 400,
      });
    }

    const addedTerm = await addGlossaryTerm(term, description, category);

    return new Response(
      JSON.stringify({
        message: "用語を追加しました",
        term: addedTerm,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("用語の追加に失敗しました:", error);
    return new Response(
      JSON.stringify({
        error: "用語の追加に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || undefined;
    const category = searchParams.get("category") || undefined;

    const terms = await searchGlossaryTerms(query, category);

    return new Response(JSON.stringify(terms), { status: 200 });
  } catch (error) {
    console.error("用語の取得に失敗しました:", error);
    return new Response(
      JSON.stringify({
        error: "用語の取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}
