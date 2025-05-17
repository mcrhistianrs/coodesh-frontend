"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TABS = ["Word list", "Favorites"];

type DictionaryApiResponse = {
  results: DictionaryEntry[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type DictionaryEntry = {
  fields: {
    word: string;
    _id: string;
  };
};

type WordDetail = {
  word: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
};

type WordDetailApiResponse = {
  results: WordDetail[];
};

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`px-6 py-2 border-b-2 font-medium focus:outline-none transition-colors text-base ${active ? "border-indigo-600 text-indigo-700 bg-gray-100" : "border-transparent text-gray-600 hover:bg-gray-50"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function WordDetailBox({ word }: { word: string }) {
  const [detail, setDetail] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!word) return;
    setLoading(true);
    setError("");
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dictionary/entries/en/${encodeURIComponent(word)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch word detail");
        return res.json();
      })
      .then((data: WordDetailApiResponse) => {
        setDetail(data.results[0]);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load word detail");
        setLoading(false);
      });
  }, [word]);

  return (
    <div className="bg-purple-100 rounded-lg p-6 shadow-md min-h-[220px] flex flex-col items-center justify-center">
      {loading && <div className="text-indigo-500">Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {detail && (
        <>
          <div className="text-2xl font-bold text-gray-800 mb-2">{detail.word}</div>
          {detail.phonetics && detail.phonetics.length > 0 && (
            <div className="text-indigo-700 mb-2">
              {detail.phonetics[0].text}
              {detail.phonetics[0].audio && (
                <audio controls className="ml-2 align-middle">
                  <source src={detail.phonetics[0].audio} type="audio/mpeg" />
                </audio>
              )}
            </div>
          )}
          <div className="mt-2 w-full">
            <div className="font-semibold text-gray-700 mb-1">Meanings</div>
            {detail.meanings.map((meaning, idx) => (
              <div key={idx} className="mb-2">
                <span className="italic text-indigo-700 mr-2">{meaning.partOfSpeech}</span>
                {meaning.definitions[0]?.definition && (
                  <span className="text-gray-800">{meaning.definitions[0].definition}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WordGrid({ onWordClick, selectedWord }: { onWordClick: (word: string) => void; selectedWord: string | null }) {
  const [words, setWords] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const observer = useRef<IntersectionObserver | null>(null);
  const lastWordRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (loading || !hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 2); // +2 porque cada "página" busca 10 palavras (duas de 5)
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchWords() {
      if (!hasMore) return;
      setLoading(true);
      setError("");
      try {
        // Busca 10 palavras: duas requisições de 5
        const fetchBatch = async (p: number) => {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dictionary/entries/en?limit=5&page=${p}`);
          if (!res.ok) throw new Error("Failed to fetch words");
          const data: DictionaryApiResponse = await res.json();
          return data.results.map((e: DictionaryEntry) => e.fields.word);
        };
        const [batch1, batch2] = await Promise.all([
          fetchBatch(page),
          fetchBatch(page + 1),
        ]);
        if (!cancelled) {
          const newWords = [...batch1, ...batch2];
          setWords(prev => [...prev, ...newWords]);
          if (newWords.length < 10) setHasMore(false);
        }
      } catch {
        if (!cancelled) setError("Could not load words");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchWords();
    return () => {
      cancelled = true;
    };
  }, [page, hasMore]);

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <table className="w-full border-collapse bg-white rounded-lg shadow-md">
        <tbody>
          {Array.from({ length: Math.ceil(words.length / 3) }).map((_, rowIdx, arr) => {
            const isLastRow = rowIdx === arr.length - 1;
            return (
              <tr
                key={rowIdx}
                ref={isLastRow && words.length > 0 ? lastWordRef : undefined}
              >
                {words.slice(rowIdx * 3, rowIdx * 3 + 3).map((word, colIdx) => (
                  <td
                    key={colIdx}
                    className={`border px-4 py-3 text-center text-gray-800 text-base font-medium cursor-pointer transition ${selectedWord === word ? "bg-indigo-100" : "hover:bg-indigo-50"}`}
                    onClick={() => onWordClick(word)}
                  >
                    {word}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {loading && <div className="text-center py-4 text-indigo-500">Loading...</div>}
      {error && <div className="text-center py-4 text-red-500">{error}</div>}
      {!hasMore && !loading && (
        <div className="text-center py-4 text-gray-400 text-sm">No more words</div>
      )}
    </div>
  );
}

export default function DictionaryPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-indigo-500 h-10 w-full" />
      <div className="flex-1 flex flex-col items-center justify-start w-full px-2 md:px-8 py-6">
        <div className="w-full max-w-5xl flex flex-row gap-8 h-full">
          {/* Detalhe da palavra */}
          <div className="flex flex-col w-1/3 min-w-[260px] max-w-xs">
            {selectedWord ? (
              <WordDetailBox word={selectedWord} />
            ) : (
              <div className="bg-purple-50 rounded-lg p-6 shadow-md min-h-[220px] flex items-center justify-center text-gray-400">
                Selecione uma palavra
              </div>
            )}
          </div>
          {/* Lista de palavras e abas */}
          <div className="flex-1 flex flex-col">
            <div className="flex border-b mb-4">
              {TABS.map((tab, idx) => (
                <TabButton
                  key={tab}
                  label={tab}
                  active={activeTab === idx}
                  onClick={() => {
                    setActiveTab(idx);
                    setSelectedWord(null);
                  }}
                />
              ))}
            </div>
            {activeTab === 0 && (
              <WordGrid onWordClick={setSelectedWord} selectedWord={selectedWord} />
            )}
            {activeTab === 1 && (
              <div className="text-center text-gray-500 mt-8">Favorites (em breve)</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 