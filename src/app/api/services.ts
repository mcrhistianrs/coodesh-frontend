type DictionaryEntry = {
  fields: {
    word: string;
    _id: string;
  };
};

export async function fetchWords(page: number): Promise<string[]> {
  const res1 = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dictionary/entries/en?limit=5&page=${page}`);
  if (!res1.ok) throw new Error("Failed to fetch words");
  const data1 = await res1.json();
  const res2 = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dictionary/entries/en?limit=5&page=${page + 1}`);
  if (!res2.ok) throw new Error("Failed to fetch words");
  const data2 = await res2.json();
  return [
    ...data1.results.map((e: DictionaryEntry) => e.fields.word),
    ...data2.results.map((e: DictionaryEntry) => e.fields.word),
  ];
}

export async function fetchWordDetail(word: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dictionary/entries/en/${encodeURIComponent(word)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch word detail");
  return res.json();
}

export async function fetchFavorites(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/me/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch favorites");
  return res.json();
}

export async function addFavorite(word: string, token: string) {
  await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dictionary/entries/en/${encodeURIComponent(word)}/favorite`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ word }),
  });
}

export async function removeFavorite(word: string, token: string) {
  await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dictionary/entries/en/${encodeURIComponent(word)}/unfavorite`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ word }),
  });
}

export async function fetchHistory(token: string, page: number) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/me/history?page=${page}&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
