// Vercel Serverless Function 예시
// 경로: /api/notion-tasks.js
// 필요 환경변수:
// - NOTION_TOKEN: Notion Internal Integration Secret
// - NOTION_DATA_SOURCE_ID: 협업 일정 데이터베이스의 data source ID
// 선택 환경변수:
// - NOTION_TITLE_PROP=업무명
// - NOTION_OWNER_PROP=담당자
// - NOTION_DATE_PROP=기간
// - NOTION_STATUS_PROP=상태
// - NOTION_ROLE_PROP=역할
// - NOTION_VERSION=2026-03-11

const NOTION_API = "https://api.notion.com/v1";
const NOTION_COLOR_TO_HEX = {
  default: "#8a8178",
  gray: "#8a8178",
  brown: "#B89372",
  orange: "#E3A74F",
  yellow: "#D8B658",
  green: "#6FA58A",
  blue: "#76A7B8",
  purple: "#8E7CC3",
  pink: "#B97BA6",
  red: "#D96C5F"
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function textFromRichText(list = []) {
  return list.map(item => item.plain_text || item.text?.content || "").join("").trim();
}

function sanitizeId(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣_-]/gi, "") || "unknown";
}

function extractTitle(prop) {
  if (!prop) return "제목 없음";
  if (prop.type === "title") return textFromRichText(prop.title) || "제목 없음";
  if (prop.type === "rich_text") return textFromRichText(prop.rich_text) || "제목 없음";
  return "제목 없음";
}

function extractDate(prop) {
  const date = prop?.type === "date" ? prop.date : null;
  if (!date?.start) return null;
  return {
    start: date.start.slice(0, 10),
    end: (date.end || date.start).slice(0, 10)
  };
}

function extractRole(prop) {
  if (!prop) return "";
  if (prop.type === "select") return prop.select?.name || "";
  if (prop.type === "status") return prop.status?.name || "";
  if (prop.type === "rich_text") return textFromRichText(prop.rich_text);
  if (prop.type === "title") return textFromRichText(prop.title);
  return "";
}

function normalizeStatus(name = "") {
  const value = name.trim().toLowerCase();
  if (["완료", "done", "complete", "completed"].includes(value)) return "done";
  if (["진행", "진행중", "in progress", "doing", "progress"].includes(value)) return "doing";
  if (["막힘", "blocked", "보류", "확인 필요", "issue"].includes(value)) return "blocked";
  return "todo";
}

function extractStatus(prop) {
  if (!prop) return "todo";
  if (prop.type === "status") return normalizeStatus(prop.status?.name || "");
  if (prop.type === "select") return normalizeStatus(prop.select?.name || "");
  if (prop.type === "checkbox") return prop.checkbox ? "done" : "todo";
  if (prop.type === "rich_text") return normalizeStatus(textFromRichText(prop.rich_text));
  return "todo";
}

function ownerFromName(name, color = "default", role = "") {
  return {
    id: sanitizeId(name),
    name: name || "미지정",
    role,
    color: NOTION_COLOR_TO_HEX[color] || NOTION_COLOR_TO_HEX.default
  };
}

function extractOwners(prop, role = "") {
  if (!prop) return [ownerFromName("미지정", "gray", role)];

  if (prop.type === "people" && Array.isArray(prop.people) && prop.people.length) {
    return prop.people.map(person => ({
      id: person.id || sanitizeId(person.name),
      name: person.name || person.person?.email || "이름 없음",
      role,
      color: NOTION_COLOR_TO_HEX.default
    }));
  }

  if (prop.type === "select" && prop.select) {
    return [ownerFromName(prop.select.name, prop.select.color, role)];
  }

  if (prop.type === "multi_select" && prop.multi_select?.length) {
    return prop.multi_select.map(item => ownerFromName(item.name, item.color, role));
  }

  if (prop.type === "status" && prop.status) {
    return [ownerFromName(prop.status.name, prop.status.color, role)];
  }

  if (prop.type === "rich_text") {
    return [ownerFromName(textFromRichText(prop.rich_text) || "미지정", "gray", role)];
  }

  if (prop.type === "title") {
    return [ownerFromName(textFromRichText(prop.title) || "미지정", "gray", role)];
  }

  return [ownerFromName("미지정", "gray", role)];
}

function overlaps(start, end, weekStart, weekEnd) {
  return start <= weekEnd && end >= weekStart;
}

async function queryNotion({ cursor, env, weekEnd }) {
  const body = {
    page_size: 100,
    sorts: [
      { property: env.DATE_PROP, direction: "ascending" }
    ],
    filter: {
      and: [
        { property: env.DATE_PROP, date: { is_not_empty: true } },
        { property: env.DATE_PROP, date: { on_or_before: weekEnd } }
      ]
    }
  };

  if (cursor) body.start_cursor = cursor;

  const response = await fetch(`${NOTION_API}/data_sources/${env.DATA_SOURCE_ID}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.TOKEN}`,
      "Notion-Version": env.VERSION,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API ${response.status}: ${text}`);
  }

  return response.json();
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const env = {
    TOKEN: process.env.NOTION_TOKEN,
    DATA_SOURCE_ID: process.env.NOTION_DATA_SOURCE_ID,
    TITLE_PROP: process.env.NOTION_TITLE_PROP || "업무명",
    OWNER_PROP: process.env.NOTION_OWNER_PROP || "담당자",
    DATE_PROP: process.env.NOTION_DATE_PROP || "기간",
    STATUS_PROP: process.env.NOTION_STATUS_PROP || "상태",
    ROLE_PROP: process.env.NOTION_ROLE_PROP || "역할",
    VERSION: process.env.NOTION_VERSION || "2026-03-11"
  };

  if (!env.TOKEN || !env.DATA_SOURCE_ID) {
    return res.status(500).json({
      error: "Missing NOTION_TOKEN or NOTION_DATA_SOURCE_ID environment variable"
    });
  }

  const weekStart = String(req.query.start || "");
  const weekEnd = String(req.query.end || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)) {
    return res.status(400).json({ error: "start/end query must be YYYY-MM-DD" });
  }

  try {
    let cursor;
    const pages = [];
    do {
      const data = await queryNotion({ cursor, env, weekEnd });
      pages.push(...(data.results || []));
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const ownerMap = new Map();
    const tasks = [];

    for (const page of pages) {
      const props = page.properties || {};
      const date = extractDate(props[env.DATE_PROP]);
      if (!date || !overlaps(date.start, date.end, weekStart, weekEnd)) continue;

      const title = extractTitle(props[env.TITLE_PROP]);
      const status = extractStatus(props[env.STATUS_PROP]);
      const role = extractRole(props[env.ROLE_PROP]);
      const pageOwners = extractOwners(props[env.OWNER_PROP], role);

      for (const owner of pageOwners) {
        if (!ownerMap.has(owner.id)) ownerMap.set(owner.id, owner);
        tasks.push({
          id: `${page.id}-${owner.id}`,
          notionPageId: page.id,
          title,
          ownerId: owner.id,
          ownerName: owner.name,
          start: date.start,
          end: date.end,
          status,
          url: page.url
        });
      }
    }

    return res.status(200).json({
      owners: Array.from(ownerMap.values()),
      tasks
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
