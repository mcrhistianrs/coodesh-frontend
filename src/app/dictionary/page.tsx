"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addFavorite, fetchFavorites, fetchHistory, fetchWordDetail, fetchWords, removeFavorite } from "../api/services";
import { useAuthStore } from "../auth-store";


const TABS = ["Word list", "Favorites", "History"];

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

type FavoriteWord = {
  word: string;
  added: string;
};

type HistoryWord = {
  word: string;
  added: string;
};

type HistoryApiResponse = {
  results: HistoryWord[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
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
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!word || !token) return;
    setLoading(true);
    setError("");
    fetchWordDetail(word, token)
      .then((data: WordDetailApiResponse) => {
        setDetail(data.results[0]);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load word detail");
        setLoading(false);
      });
  }, [word, token]);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-purple-100 rounded-lg p-6 shadow-md min-h-[120px] min-w-[200px] flex flex-col items-center justify-center mb-4 w-full">
        {loading && <div className="text-indigo-500">Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {detail && (
          <>
            <div className="text-2xl font-bold text-gray-800 mb-2">{detail.word}</div>
            {detail.phonetics && detail.phonetics.length > 0 && detail.phonetics[0].text && (
              <div className="text-indigo-700 mb-2">{detail.phonetics[0].text}</div>
            )}
          </>
        )}
      </div>
      {detail && (
        <div className="w-full">
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
      )}
    </div>
  );
}

function WordGrid({ onWordClick, selectedWord, favorites, onToggleFavorite }: { onWordClick: (word: string) => void; selectedWord: string | null; favorites: string[]; onToggleFavorite: (word: string, isFavorite: boolean) => void }) {
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
          setPage(prev => prev + 2);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadWords() {
      if (!hasMore) return;
      setLoading(true);
      setError("");
      try {
        const newWords = await fetchWords(page);
        if (!cancelled) {
          setWords(prev => [...prev, ...newWords]);
          if (newWords.length < 10) setHasMore(false);
        }
      } catch {
        if (!cancelled) setError("Could not load words");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadWords();
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
                {words.slice(rowIdx * 3, rowIdx * 3 + 3).map((word, colIdx) => {
                  const isFavorite = favorites.includes(word);
                  return (
                    <td
                      key={colIdx}
                      className={`border px-4 py-3 text-center text-gray-800 text-base font-medium cursor-pointer transition relative ${selectedWord === word ? "bg-indigo-100" : "hover:bg-indigo-50"}`}
                      onClick={() => onWordClick(word)}
                    >
                      {word}
                      {!isFavorite && (
                        <button
                          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200"
                          onClick={e => {
                            e.stopPropagation();
                            onToggleFavorite(word, false);
                          }}
                          aria-label="Adicionar aos favoritos"
                        >
                          <span className="text-green-600 text-lg">＋</span>
                        </button>
                      )}
                    </td>
                  );
                })}
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

function FavoritesList({ onUnfavorite }: { onUnfavorite: (word: string) => void }) {
  const token = useAuthStore((state) => state.token);
  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFavs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchFavorites(token);
      setFavorites(data.results);
    } catch {
      setError("Could not load favorites");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFavs();
  }, [fetchFavs]);

  const handleUnfavorite = async (word: string) => {
    if (!token) return;
    try {
      await removeFavorite(word, token);
      setFavorites(favorites => favorites.filter(fav => fav.word !== word));
      onUnfavorite(word);
    } catch {}
  };

  return (
    <div className="flex-1 overflow-y-auto w-full">
      {loading && <div className="text-center py-4 text-indigo-500">Loading...</div>}
      {error && <div className="text-center py-4 text-red-500">{error}</div>}
      <table className="w-full border-collapse bg-white rounded-lg shadow-md">
        <tbody>
          {favorites.map((fav) => (
            <tr key={fav.word}>
              <td className="border px-4 py-3 text-center text-gray-800 text-base font-medium">{fav.word}</td>
              <td className="border px-4 py-3 text-center">
                <button
                  className="bg-red-100 hover:bg-red-200 rounded-full w-8 h-8 flex items-center justify-center"
                  onClick={() => handleUnfavorite(fav.word)}
                  aria-label="Remover dos favoritos"
                >
                  <span className="text-red-500 text-lg">-</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && favorites.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">Nenhum favorito</div>
      )}
    </div>
  );
}

function HistoryList() {
  const token = useAuthStore((state) => state.token);
  const [history, setHistory] = useState<HistoryWord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const observer = useRef<IntersectionObserver | null>(null);
  const lastRowRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (loading || !hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    if (!token || !hasMore) return;
    setLoading(true);
    setError("");
    fetchHistory(token, page)
      .then((data: HistoryApiResponse) => {
        setHistory(prev => [...prev, ...data.results]);
        setHasMore(data.hasNext);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load history");
        setLoading(false);
      });
  }, [token, page, hasMore]);

  return (
    <div className="flex-1 overflow-y-auto w-full">
      {loading && <div className="text-center py-4 text-indigo-500">Loading...</div>}
      {error && <div className="text-center py-4 text-red-500">{error}</div>}
      <table className="w-full border-collapse bg-white rounded-lg shadow-md">
        <tbody>
          {history.map((item, idx, arr) => (
            <tr key={item.word + item.added + idx} ref={idx === arr.length - 1 ? lastRowRef : undefined}>
              <td className="border px-4 py-3 text-center text-gray-800 text-base font-medium">{item.word}</td>
              <td className="border px-4 py-3 text-center text-gray-500 text-sm">{new Date(item.added).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && history.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">Nenhum histórico</div>
      )}
    </div>
  );
}

export default function DictionaryPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const token = useAuthStore((state) => state.token);

  const fetchFavs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchFavorites(token);
      setFavorites(data.results.map((f: FavoriteWord) => f.word));
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchFavs();
  }, [fetchFavs]);

  const handleToggleFavorite = async (word: string, isFavorite: boolean) => {
    if (!token) return;
    if (isFavorite) {
      await removeFavorite(word, token);
      setFavorites(favs => favs.filter(f => f !== word));
    } else {
      await addFavorite(word, token);
      setFavorites(favs => [...favs, word]);
    }
  };

  const handleUnfavoriteFromFavorites = (word: string) => {
    setFavorites(favs => favs.filter(f => f !== word));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-indigo-500 h-10 w-full" />
      <div className="flex-1 flex flex-col items-center justify-start w-full px-2 md:px-8 py-6 relative">
        {selectedWord && (
          <div className="fixed top-20 left-8 z-20 w-[320px] max-w-xs">
            <WordDetailBox word={selectedWord} />
          </div>
        )}
        <div className="w-full max-w-5xl flex flex-row gap-8 h-full">
          <div className="w-1/3 min-w-[260px] max-w-xs" />
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
              <WordGrid onWordClick={setSelectedWord} selectedWord={selectedWord} favorites={favorites} onToggleFavorite={handleToggleFavorite} />
            )}
            {activeTab === 1 && (
              <FavoritesList onUnfavorite={handleUnfavoriteFromFavorites} />
            )}
            {activeTab === 2 && (
              <HistoryList />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 