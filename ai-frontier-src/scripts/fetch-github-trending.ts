import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
  todayStars: number;
  language: string;
  topics: string[];
  isNew: boolean; // true = first time appearing in last 7 days
}

const SEEN_REPOS_PATH = path.join(process.cwd(), "data", "github-seen.json");
const SEEN_TTL_DAYS = 7;

function loadSeenRepos(): Record<string, string> {
  try {
    if (fs.existsSync(SEEN_REPOS_PATH)) {
      return JSON.parse(fs.readFileSync(SEEN_REPOS_PATH, "utf-8"));
    }
  } catch {}
  return {};
}

function saveSeenRepos(seen: Record<string, string>) {
  fs.mkdirSync(path.dirname(SEEN_REPOS_PATH), { recursive: true });
  fs.writeFileSync(SEEN_REPOS_PATH, JSON.stringify(seen, null, 2), "utf-8");
}

function pruneOldEntries(seen: Record<string, string>): Record<string, string> {
  const cutoff = new Date(Date.now() - SEEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return Object.fromEntries(
    Object.entries(seen).filter(([, dateStr]) => new Date(dateStr) > cutoff)
  );
}

export async function fetchGitHubTrending(
  since: "daily" | "weekly" = "daily",
  language = ""
): Promise<GitHubRepo[]> {
  const url = `https://github.com/trending${language ? `/${language}` : ""}?since=${since}&spoken_language_code=en`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
    },
  });

  if (!res.ok) throw new Error(`GitHub trending fetch failed: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const repos: GitHubRepo[] = [];

  // Load and prune seen repos
  let seen = loadSeenRepos();
  seen = pruneOldEntries(seen);

  const today = new Date().toISOString().split("T")[0];

  $("article.Box-row").each((_, el) => {
    const $el = $(el);

    const nameEl = $el.find("h2 a");
    const fullName = nameEl.attr("href")?.replace(/^\//, "") ?? "";
    const [owner, repo] = fullName.split("/");
    const name = `${owner}/${repo}`;

    const description = $el.find("p").first().text().trim();
    const repoUrl = `https://github.com/${fullName}`;

    const starsText = $el
      .find('a[href*="/stargazers"]')
      .first()
      .text()
      .trim()
      .replace(/,/g, "");
    const stars = parseInt(starsText) || 0;

    const todayText = $el.find(".float-sm-right").text().trim();
    const todayMatch = todayText.match(/(\d[\d,]*)\s+stars today/);
    const todayStars = todayMatch ? parseInt(todayMatch[1].replace(/,/g, "")) : 0;

    const language = $el.find('[itemprop="programmingLanguage"]').text().trim();

    if (fullName) {
      const isNew = !(fullName in seen);
      repos.push({
        name,
        fullName,
        description,
        url: repoUrl,
        stars,
        todayStars,
        language,
        topics: [],
        isNew,
      });

      // Mark as seen
      seen[fullName] = today;
    }
  });

  // Persist updated seen list
  saveSeenRepos(seen);

  return repos.slice(0, 25);
}

export function filterAIRepos(repos: GitHubRepo[]): GitHubRepo[] {
  const aiKeywords = [
    "llm", "ai", "gpt", "claude", "gemini", "agent", "rag", "diffusion",
    "model", "transformer", "inference", "fine-tun", "embedding", "vector",
    "langchain", "openai", "anthropic", "mistral", "ollama", "mcp", "a2a",
    "multimodal", "vision", "tts", "speech", "nlp", "neural", "copilot",
    "assistant", "chatbot", "prompt", "lora", "vllm", "sglang",
  ];

  return repos.filter((repo) => {
    const text = `${repo.name} ${repo.description}`.toLowerCase();
    return aiKeywords.some((kw) => kw.length <= 3 ? new RegExp(`(^|[^a-z])${kw}([^a-z]|$)`, "i").test(text) : text.includes(kw));
  });
}
