import { useEffect, useState } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";
import JSZip from "jszip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const studyTabs = ["Overview", "Revision sheet", "Flashcards", "Practice exam"];

// Affichage pedagogique : Markdown, formules LaTeX et resultats verifies.
// On n'interprete jamais le Markdown comme du HTML brut.
function cleanAIMarkdown(value) {
  let text = String(value || '').replace(/\r\n?/g, '\n').trim();
  // Certains moteurs renvoient des formules dans un bloc ```math.
  // remark-math attend plutôt les délimiteurs $$ sur leurs propres lignes.
  text = text.replace(/```(?:math|latex|tex)\s*\n([\s\S]*?)\n```/gi, (_, formula) => `\n$$\n${formula.trim()}\n$$\n`);
  // Normalise les anciens blocs $$formule$$ en blocs lisibles par remark-math.
  text = text.replace(/\$\$\s*([^$\n][^$]*?)\s*\$\$/g, (_, formula) => `\n$$\n${formula.trim()}\n$$\n`);
  // Convertit seulement les expressions LaTeX explicites entre accents graves.
  // Le code ordinaire entre accents graves reste du code.
  text = text.replace(/`([^`\n]+)`/g, (whole, inside) => {
    return /\\(?:frac|partial|sqrt|int|sum|boxed|cdot|left|right)|[∂∫∑]/.test(inside)
      ? `$${inside}$` : whole;
  });
  return text;
}

function BeautifulAIAnswer({ answer }) {
  const md = cleanAIMarkdown(answer);
  return <article className="sm-ai-result sm-card" aria-label="Réponse StudyMind AI">
    <div className="sm-ai-result-top">
      <span className="sm-ai-result-star" aria-hidden="true">✦</span>
      <div><p className="eyebrow">STUDYMIND AI · TON ASSISTANT</p><h2>Une réponse claire, étape par étape</h2></div>
    </div>
    <div className="sm-ai-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({children}) => <h2 className="sm-ai-heading">{children}</h2>,
          h2: ({children}) => <h2 className="sm-ai-heading">{children}</h2>,
          h3: ({children}) => <h3 className="sm-ai-subheading">{children}</h3>,
          blockquote: ({children}) => <blockquote className="sm-ai-tip">{children}</blockquote>,
          table: ({children}) => <div className="sm-ai-table-wrap"><table>{children}</table></div>,
        }}>{md}</ReactMarkdown>
    </div>
    <div className="sm-ai-foot">Pour tes révisions, compare les formules importantes avec ton cours.</div>
    <style>{`
      .sm-ai-result{padding:clamp(20px,4vw,42px);margin-bottom:18px;border:1px solid #e8d6bd;background:#fffdf9;box-shadow:0 12px 35px rgba(83,61,35,.06)}
      .sm-ai-result-top{display:flex;align-items:center;gap:16px;border-bottom:1px solid #ecdfce;padding-bottom:20px;margin-bottom:25px}
      .sm-ai-result-star{display:grid;place-items:center;flex:none;width:52px;height:52px;border-radius:15px;background:#f4e4cb;color:#ac7b3d;font-size:27px}
      .sm-ai-result-top h2{font:600 clamp(21px,3vw,29px)/1.23 Georgia,serif;color:#35271d;margin:4px 0 0}
      .sm-ai-result-top .eyebrow{margin:0;letter-spacing:.1em;font-size:11px}
      .sm-ai-prose{font-size:15px;line-height:1.83;color:#4b3a2b;overflow-wrap:anywhere;counter-reset:ai-heading}
      .sm-ai-prose h2.sm-ai-heading{font:600 clamp(20px,3vw,25px)/1.3 Georgia,serif;color:#423020;margin:34px 0 17px;padding:0 0 13px;border-bottom:1px solid #ead9c3;display:flex;gap:13px;align-items:baseline}
      .sm-ai-prose h2.sm-ai-heading::before{counter-increment:ai-heading;content:counter(ai-heading,decimal-leading-zero);font:700 14px/1.4 system-ui;color:#b5834b}
      .sm-ai-prose h3.sm-ai-subheading{font:600 18px/1.4 Georgia,serif;color:#80552c;margin:27px 0 11px}
      .sm-ai-prose p{margin:13px 0}
      .sm-ai-prose ul,.sm-ai-prose ol{padding-left:28px;margin:13px 0 20px}
      .sm-ai-prose li{padding-left:4px;margin:9px 0}
      .sm-ai-prose li::marker{color:#b78347;font-weight:700}
      .sm-ai-prose strong{color:#382819}
      .sm-ai-prose .katex-display{background:linear-gradient(135deg,#fff9ed,#f5e7d1);border:1px solid #e5cfaa;border-left:4px solid #bf8b4f;padding:20px 12px;border-radius:13px;margin:20px 0;overflow-x:auto;overflow-y:hidden;font-size:1.10em}
      .sm-ai-prose .katex:not(.katex-display .katex){color:#8a562a}
      .sm-ai-prose blockquote.sm-ai-tip{border-left:4px solid #c59658;background:#faf1e5;border-radius:0 12px 12px 0;padding:10px 18px;margin:22px 0}
      .sm-ai-prose .katex{overflow-wrap:normal}
      .sm-ai-prose code{background:#f5ecdf;padding:3px 6px;border-radius:5px;font-size:.93em}
      .sm-ai-table-wrap{overflow-x:auto;margin:18px 0}.sm-ai-table-wrap table{width:100%;border-collapse:collapse}.sm-ai-table-wrap td,.sm-ai-table-wrap th{border-bottom:1px solid #eadcca;padding:10px;text-align:left}.sm-ai-table-wrap th{background:#f7ebda}
      .sm-ai-foot{border-top:1px solid #ecdfce;margin-top:28px;padding-top:14px;font-size:12px;color:#927d67}
    `}</style>
  </article>;
}

function makeStudyContent(text) {
  // Les résumés peuvent aider au repérage, mais ne génèrent PAS de questions.
  // Ne jamais transformer les titres et dates PDF en fausses cartes ou examens.
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const valid = sentences.filter(item => item.length > 55 &&
    !/TITRE DE LA PR[ÉE]SENTATION|\b\d{2}\/\d{2}\/20\d{2}\b/i.test(item));
  return { summary: valid.slice(0, 5), terms: valid.slice(0, 8), cards: [], questions: [] };
}

// Recherche documentaire 100 % locale : extrait les passages les plus pertinents.
function findCoursePassages(question, documents) {
  const common = new Set(["avec","dans","pour","quel","quelle","quels","quelles","comment","pourquoi","est","sont","des","les","une","sur","the","what","from","and","that","this","cours","explique","moi"]);
  const terms = (question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/g) || []).filter(w => !common.has(w));
  if (!terms.length) return [];
  const chunks = [];
  for (const doc of documents) {
    if (!doc || typeof doc !== "object") continue;
    const source = String(doc.source || "");
    if (!source.trim()) continue;
    // Chevauchement de 160 caractères pour ne pas perdre une phrase à la frontière.
    for (let start = 0; start < source.length; start += 740) {
      const text = source.slice(start, start + 900);
      const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const score = terms.reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0);
      if (score) chunks.push({ title: String(doc.title || "Document"), text, score, offset: start });
    }
  }
  return chunks.sort((a,b) => b.score - a.score).slice(0,4);
}


// Présentation éditoriale des fiches. Ne change pas le contenu généré par le modèle.
function RevisionMarkdown({ content }) {
  const lines = String(content || "").replace(/\\(?=#{1,4}\s)/g, "").split(/\r?\n/);
  let section = "";
  let formulaIndex = 0;
  let sectionIndex = 0;
  const inline = (value) => String(value).split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$\n]+\$)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2,-2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code className="sm-sheet-math" key={i}>{part.slice(1,-1)}</code>;
    if (/^\$[^$\n]+\$$/.test(part)) return <span className="sm-sheet-math" key={i}>{part.slice(1,-1)}</span>;
    return <span key={i}>{part}</span>;
  });
  const blocks = [];
  let formulaLines = [];
  function flushFormula() {
    if (!formulaLines.length) return;
    const value = formulaLines.join(" ").replace(/^\$\$|\$\$$/g, "").trim();
    blocks.push(<div className="sm-sheet-formula" key={`formula-${blocks.length}`}>
      <div className="sm-sheet-formula-label">FORMULE À CONNAÎTRE</div>
      <div className="sm-sheet-equation">{inline(value)}</div>
    </div>);
    formulaLines = [];
  }
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line) { flushFormula(); continue; }
    if (line.startsWith("$$")) {
      formulaLines.push(line);
      if (line.endsWith("$$") && line.length > 4) flushFormula();
      continue;
    }
    if (formulaLines.length) { formulaLines.push(line); if (line.endsWith("$$")) flushFormula(); continue; }
    const heading = line.match(/^#{1,4}\s+(.+)/);
    if (heading) {
      section = heading[1].replace(/\*\*/g, "").toLowerCase();
      sectionIndex++;
      const important = /retenir|formule|définition|méthode|exemple|vérifier/i.test(section);
      blocks.push(<div className={`sm-sheet-section-title ${important ? "sm-sheet-section-featured" : ""}`} key={index}>
        <span className="sm-sheet-section-number">{String(sectionIndex).padStart(2,"0")}</span>
        <h3>{inline(heading[1])}</h3>
      </div>);
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.+)/);
    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    const body = bullet?.[1] || numbered?.[1] || line;
    const formulaSection = /formule|équation|relation/i.test(section);
    const mathematical = /(?:[=≈≤≥∂∫∑√]|\\frac|\\partial)/.test(body);
    if (formulaSection && mathematical && body.length < 260) {
      formulaIndex++;
      blocks.push(<div className="sm-sheet-formula" key={index}>
        <div className="sm-sheet-formula-label">FORMULE {String(formulaIndex).padStart(2,"0")}</div>
        <div className="sm-sheet-equation">{inline(body)}</div>
      </div>);
    } else if (/formule à vérifier|texte incomplet|source insuffisante/i.test(body)) {
      blocks.push(<div className="sm-sheet-warning" key={index}>{inline(body)}</div>);
    } else if (bullet || numbered) {
      blocks.push(<div className="sm-sheet-point" key={index}><span className="sm-sheet-dot" aria-hidden="true"/><span>{inline(body)}</span></div>);
    } else {
      blocks.push(<p className="sm-sheet-paragraph" key={index}>{inline(body)}</p>);
    }
  }
  flushFormula();
  return <div className="sm-sheet-new">
    <style>{`
      .sm-sheet-new{color:#392b23;line-height:1.75;font-size:15px;max-width:100%;}
      .sm-sheet-section-title{display:flex;align-items:center;gap:14px;margin:34px 0 18px;padding-bottom:12px;border-bottom:1px solid #ead8c3}
      .sm-sheet-section-title h3{margin:0;font:600 clamp(22px,3vw,29px)/1.3 'Playfair Display',Georgia,serif;letter-spacing:-.02em;color:#32251e}
      .sm-sheet-section-number{color:#aa7a42;font:700 13px/1.4 Arial,sans-serif;letter-spacing:.08em}
      .sm-sheet-section-featured{border-bottom:2px solid #dfbe92}
      .sm-sheet-section-featured h3{color:#6b431f}
      .sm-sheet-paragraph{margin:11px 0 14px}
      .sm-sheet-point{display:flex;gap:13px;align-items:flex-start;margin:12px 0;padding:9px 12px;border-radius:10px;background:rgba(246,237,224,.46)}
      .sm-sheet-dot{flex:none;width:8px;height:8px;background:#bf925c;border-radius:50%;margin-top:10px}
      .sm-sheet-point strong{color:#45321f}
      .sm-sheet-formula{margin:17px 0;padding:21px 24px;background:linear-gradient(125deg,#fff9ed,#f4e6d3);border:1px solid #e7c89d;border-left:5px solid #b7803e;border-radius:17px;box-shadow:0 4px 18px rgba(94,68,36,.06)}
      .sm-sheet-formula-label{font-size:10px;letter-spacing:.18em;color:#956329;font-weight:750;margin-bottom:10px}
      .sm-sheet-equation{font:600 clamp(17px,2.3vw,22px)/1.7 Georgia,serif;color:#4b321b;overflow-wrap:anywhere;white-space:pre-wrap}
      .sm-sheet-math{font:600 1.08em/1.5 Georgia,serif;color:#6c471f;padding:2px 5px;background:#f7e9d2;border-radius:5px}
      .sm-sheet-warning{padding:13px 16px;border-radius:12px;background:#f9f0e3;color:#866442;margin:13px 0}
    `}</style>
    {blocks}
  </div>;
}
function StudyMindApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const page = location.pathname.split("/")[1] || "home";
  const goTo = (target) => { navigate(target === "home" ? "/" : `/${target}`); setMenuOpen(false); window.scrollTo(0, 0); };
  const [menuOpen, setMenuOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [file, setFile] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [studyContent, setStudyContent] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answers, setAnswers] = useState({});
  const [writtenAnswers, setWrittenAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [sessions, setSessions] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem("studymind-sessions") || "[]"); return Array.isArray(value) ? value.filter(x=>x && typeof x === "object") : []; } catch { return []; }
  });
  const [documents, setDocuments] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem("studymind-documents") || "[]"); return Array.isArray(value) ? value.filter(x=>x && typeof x === "object" && typeof x.title === "string") : []; } catch { return []; }
  });
  const [librarySearch, setLibrarySearch] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [plannedDate, setPlannedDate] = useState(new Date().toLocaleDateString("sv-SE"));
  const [plannedTask, setPlannedTask] = useState("");
  const [planModal, setPlanModal] = useState(false);
  const [planTime, setPlanTime] = useState("18:00");
  const [planMinutes, setPlanMinutes] = useState(30);
  const [planFormat, setPlanFormat] = useState("Revision sheet");
  const [planNotes, setPlanNotes] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [plans, setPlans] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem("studymind-plans") || "[]"); return Array.isArray(value) ? value.filter(x=>x && typeof x === "object" && typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date)) : []; } catch { return []; }
  });
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState("study");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiMathVerification, setAiMathVerification] = useState(null);
  const [aiPassages, setAiPassages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [aiMode, setAiMode] = useState("auto");
  const [aiSources, setAiSources] = useState([]);
  const [aiSourceMode, setAiSourceMode] = useState("");
  const [revisionSheetAI, setRevisionSheetAI] = useState("");
  const [revisionSheetLoading, setRevisionSheetLoading] = useState(false);
  const [revisionSheetError, setRevisionSheetError] = useState("");
  const [revisionSheetSource, setRevisionSheetSource] = useState("");
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState("");
  const [flashcardsGenerated, setFlashcardsGenerated] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState("");
  const [examGenerated, setExamGenerated] = useState(false);
  const [examGrading, setExamGrading] = useState(false);
  const [examGradeError, setExamGradeError] = useState("");
  const [examGradeResult, setExamGradeResult] = useState(null);

  const generateRevisionSheetAI = async () => {
    if (!sourceText.trim()) { setRevisionSheetError("Ouvre ou importe d'abord un cours contenant du texte."); return; }
    setRevisionSheetLoading(true);
    setRevisionSheetError("");
    setRevisionSheetAI("");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);
      let response;
      try {
        response = await fetch("http://127.0.0.1:8765/sheet", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({title: file?.name || "Cours de la bibliothèque", text: sourceText}),
          signal: controller.signal
        });
      } finally { clearTimeout(timeout); }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "La génération a échoué.");
      if (!result.sheet || !result.sheet.trim()) throw new Error("Le modèle n'a pas produit de fiche.");
      const sheetLines = result.sheet.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      const normalized = sheetLines.map(x=>x.toLowerCase().replace(/^[\d.#*\s-]+/, ""));
      const repeats = normalized.reduce((map,x)=>(map[x]=(map[x]||0)+1,map),{});
      const hasRunaway = sheetLines.length > 90 || Object.values(repeats).some(n=>n>=5);
      if (hasRunaway) throw new Error("La génération a produit des répétitions anormales. Rien n'a été affiché. Relance la génération ou utilise un modèle IA plus puissant.");
      setRevisionSheetAI(result.sheet);
      setRevisionSheetSource(result.note || "Fiche créée à partir du cours importé. Vérifie les formules dans ton PDF.");
    } catch (error) {
      setRevisionSheetError("La fiche n’a pas pu être créée : " + (error.name === "AbortError" ? "délai de réponse dépassé" : error.message) + ". Réessaie dans un instant ou vérifie que l’assistant IA est démarré.");
    } finally { setRevisionSheetLoading(false); }
  };


  const generateFlashcardsAI = async () => {
    if (!sourceText.trim()) { setFlashcardsError("Ouvre un cours avant de générer des flashcards."); return; }
    setFlashcardsLoading(true);
    setFlashcardsError("");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 240000);
      let response;
      try {
        response = await fetch("http://127.0.0.1:8765/flashcards", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ title: file?.name || "Cours de la bibliothèque", text: sourceText }),
          signal: controller.signal,
        });
      } finally { clearTimeout(timeout); }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "La création des cartes a échoué.");
      const cards = (Array.isArray(result.cards) ? result.cards : []).filter(card =>
        typeof card?.question === "string" && typeof card?.answer === "string" &&
        card.question.trim().length >= 15 && card.answer.trim().length >= 10
      );
      if (cards.length < 2) throw new Error("Le cours n’a pas produit assez de cartes utiles. Essaie un document avec des définitions ou des exemples lisibles.");
      setStudyContent(prev => ({ ...prev, cards }));
      setFlashcardsGenerated(true);
      setCardIndex(0);
      setFlipped(false);
    } catch (error) {
      setFlashcardsError(error?.name === "AbortError" ? "L'analyse a pris trop de temps. Réessaie avec un cours plus court." : String(error?.message || "Erreur de connexion"));
    } finally { setFlashcardsLoading(false); }
  };

  const generateExamAI = async () => {
    if (!sourceText.trim()) { setExamError("Ouvre un cours avant de créer un examen."); return; }
    setExamLoading(true);
    setExamError("");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 240000);
      let response;
      try {
        response = await fetch("http://127.0.0.1:8765/exam", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({title: file?.name || "Cours", text:sourceText}), signal: controller.signal
        });
      } finally { clearTimeout(timeout); }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "La génération de l'examen a échoué.");
      const questions = (Array.isArray(result.questions) ? result.questions : []).filter(q =>
        typeof q?.question === "string" && typeof q?.answer === "string" &&
        q.question.trim().length >= 15 && q.answer.trim().length >= 8);
      if (questions.length < 2) throw new Error("Le cours n’a pas produit assez de questions utiles. Essaie un document avec des définitions ou des exemples lisibles.");
      setStudyContent(prev => ({...prev, questions}));
      setExamGenerated(true);
      setWrittenAnswers({}); setShowResults(false); setExamGradeResult(null); setExamGradeError("");
    } catch(error) {
      setExamError(error?.name === "AbortError" ? "La création a pris trop de temps." : String(error?.message || "Impossible de créer l'examen."));
    } finally { setExamLoading(false); }
  };

  const finishPracticeExam = async () => {
    if (!examGenerated || !studyContent?.questions?.length || examGrading) return;
    setExamGrading(true);
    setExamGradeError("");
    setExamGradeResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);
      let response;
      try {
        response = await fetch("http://127.0.0.1:8765/exam/grade", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            questions: studyContent.questions.map(q => ({question:q.question, answer:q.answer})),
            answers: studyContent.questions.map((_, index) => String(writtenAnswers[index] || ""))
          }), signal:controller.signal
        });
      } finally { clearTimeout(timeout); }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de corriger cet examen.");
      if (!Array.isArray(result.corrections) || result.corrections.length !== studyContent.questions.length) {
        throw new Error("La correction reçue n'est pas complète.");
      }
      setExamGradeResult(result);
      setShowResults(true);
    } catch(error) {
      setExamGradeError(error?.name === "AbortError" ? "La correction a pris trop de temps. Réessaie." : String(error?.message || "Correction momentanément indisponible."));
    } finally { setExamGrading(false); }
  };

  const askCourseAI = async (event) => {
    event.preventDefault();
    const allDocs = [...documents];
    // Permet de poser une question même si le cours ouvert n'a pas encore été sauvegardé.
    if (sourceText.trim() && !allDocs.some(d => d.source === sourceText)) allDocs.unshift({ title:"Cours ouvert", source:sourceText });
    const passages = findCoursePassages(aiQuestion, allDocs);
    setAiPassages(passages);
    setAiAnswer("");
    setAiSources([]);
    setAiSourceMode("");
    setAiMathVerification(null);
    const isExplicitMathQuestion = /(?:dériv|derive|différenti|differenti)/i.test(aiQuestion) && /\b[fgh]\s*\(\s*[xy]\s*(?:,\s*[xy]\s*)?\)\s*=/.test(aiQuestion);
    if (aiMode === "course" && !passages.length && !isExplicitMathQuestion) { setAiStatus("Aucun passage pertinent trouvé dans les cours. Importe un document ou choisis Recherche Web."); return; }
    setAiLoading(true);
    setAiStatus(aiMode === "course" ? "StudyMind consulte tes cours…" : aiMode === "web" ? "StudyMind recherche des sources sur le Web…" : "StudyMind prépare ta réponse…");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 240000);
      let response;
      try {
        response = await fetch("http://127.0.0.1:8765/ask", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({question:aiQuestion,passages,mode:aiMode}), signal:controller.signal
        });
      } finally { clearTimeout(timeout); }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Service IA indisponible");
      setAiAnswer(data.answer || "Aucune réponse produite.");
      setAiSources(Array.isArray(data.sources) ? data.sources : []);
      setAiSourceMode(data.source_mode || "");
      setAiMathVerification(data.math_verification || null);
      setAiStatus("Ta réponse est prête.");
    } catch (error) {
      setAiStatus("Impossible de préparer la réponse : " + (error?.message || "service indisponible") + ".");
    } finally { setAiLoading(false); }
  };


  useEffect(() => { localStorage.setItem("studymind-sessions", JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem("studymind-plans", JSON.stringify(plans)); }, [plans]);
  useEffect(() => {
    try { localStorage.setItem("studymind-documents", JSON.stringify(documents)); setStorageWarning(""); }
    catch { setStorageWarning("Stockage local saturé : certains documents récents ne pourront pas être conservés après fermeture du navigateur."); }
  }, [documents]);
  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(interval);
          setTimerRunning(false);
          setCelebrate(true);
          if (timerMode === "study") {
            setSessions((old) => [{ id: Date.now(), title: "Session Pomodoro", date: new Date().toISOString(), minutes: pomodoroMinutes, kind: "Pomodoro" }, ...old].slice(0, 100));
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerMode, pomodoroMinutes]);

  const scrollToUpload = () => goTo("upload");
  const addPlan = () => {
    if (!plannedTask.trim() || !plannedDate || !planTime || Number(planMinutes) <= 0) return;
    setPlans(old => [...old, { id: Date.now(), date: plannedDate, task: plannedTask.trim(),
      time: planTime, minutes: Number(planMinutes), format: planFormat, notes: planNotes, completed: false }]);
    setPlannedTask(""); setPlanNotes(""); setPlanModal(false);
  };
  const timer = <article className="sm-card sm-focus">
    <p className="eyebrow">FOCUS TIMER</p>
    <h2 className="sm-focus-heading">Pomodoro</h2>
    <p className="sm-focus-description">Travaille pendant une courte période, puis fais une pause.</p>
    <div className="sm-timer-panel">
      <p className="eyebrow">{timerMode === "study" ? "TEMPS DE CONCENTRATION" : "TEMPS DE PAUSE"}</p>
      <div className="sm-timer">{String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</div>
      <p>{timerRunning ? "Une chose à la fois, tu avances !" : "Prêt à commencer ?"}</p>
    </div>
    <div className="sm-focus-actions">
      {[25, 45, 50].map(m => <button key={m} className="sm-outline-btn" onClick={() => {
        setTimerRunning(false); setPomodoroMinutes(m); setSecondsLeft(m * 60);
        setTimerMode("study"); setCelebrate(false);
      }}>{m} min</button>)}
      <button className="sm-outline-btn" onClick={() => {
        setTimerRunning(false); setTimerMode("break"); setSecondsLeft(300); setCelebrate(false);
      }}>Pause 5 min</button>
    </div>
    <div className="sm-focus-actions">
      <button className="button button-dark" onClick={() => {
        if (secondsLeft === 0) { setSecondsLeft((timerMode === "study" ? pomodoroMinutes : 5) * 60); setCelebrate(false); }
        setTimerRunning(v => !v);
      }}>{timerRunning ? "Pause" : "Démarrer"}</button>
      <button className="sm-outline-btn" onClick={() => {
        setTimerRunning(false); setSecondsLeft((timerMode === "study" ? pomodoroMinutes : 5) * 60); setCelebrate(false);
      }}>Réinitialiser</button>
    </div>
  </article>;

  const processText = async (text, label = "Contenu") => {
    if (!text.trim()) {
      setMessage("Ajoute d'abord un document ou colle ton cours.");
      return;
    }
    setProcessing(true);
    setMessage("");
    try {
      // Laisse le temps à l'interface d'afficher son état de chargement.
      await new Promise((resolve) => setTimeout(resolve, 350));
      setSourceText(text);
      setRevisionSheetAI(""); setRevisionSheetError("");
      const generated = makeStudyContent(text);
      setStudyContent(generated);
      setFlashcardsGenerated(false);
      setFlashcardsError("");
      setExamGenerated(false); setExamError(""); setExamGradeResult(null); setExamGradeError("");
      setDocuments(old => [{
        id: Date.now(), title: label, date: new Date().toISOString(),
        category: /(?:examen|exam|étude de cas|etude de cas)/i.test(label) ? "Written exam" : "Course",
        description: text.replace(/\s+/g," ").trim().slice(0, 240),
        // Les documents volumineux sont limités pour respecter le stockage du navigateur.
        source: text.slice(0, 85000)
      }, ...old].slice(0, 40));
      setSessions((old) => [{ id: Date.now(), title: label, date: new Date().toISOString(), minutes: 0, kind: "Analyse du cours", characters: text.length }, ...old].slice(0, 100));
      setActiveTab("Overview");
      setCardIndex(0);
      setFlipped(false);
      setAnswers({});
      setWrittenAnswers({});
      setShowResults(false);
      setMessage(`${label} prêt à être consulté. La fiche de révision IA se génère dans l’onglet « Revision sheet ». Les flashcards et examens utilisent encore une génération simple.`);
      goTo("study");

    } finally {
      setProcessing(false);
    }
  };

  const handleFile = async () => {
    if (!file) {
      setMessage("Choisis un fichier ou colle ton cours dans la zone de texte.");
      return;
    }
    setProcessing(true);
    setMessage("Lecture du document en cours...");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let text = "";
      if (extension === "pdf" || file.type === "application/pdf") {
        const data = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n\n";
        }
      } else if (extension === "txt" || file.type.startsWith("text/")) {
        text = await file.text();
      } else if (extension === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value || "";
      } else if (extension === "pptx") {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const slidePaths = Object.keys(zip.files)
          .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
          .sort((a, b) => {
            const numberA = Number(a.match(/slide(\d+)\.xml$/)?.[1] || 0);
            const numberB = Number(b.match(/slide(\d+)\.xml$/)?.[1] || 0);
            return numberA - numberB;
          });
        for (const path of slidePaths) {
          const xml = await zip.files[path].async("text");
          const documentXml = new DOMParser().parseFromString(xml, "application/xml");
          text += Array.from(documentXml.getElementsByTagName("a:t"))
            .map((node) => node.textContent || "")
            .join(" ") + "\n\n";
        }
      } else {
        setMessage("Format non pris en charge. Choisis un PDF, DOCX, PPTX ou TXT.");
        return;
      }
      if (!text.trim()) {
        setMessage("Aucun texte détecté. Le document est peut-être scanné ou vide.");
      } else {
        processText(text, file.name);
      }
    } catch (error) {
      console.error(error);
      setMessage("Impossible de lire ce fichier. Essaie un PDF avec du texte ou un fichier TXT.");
    } finally {
      setProcessing(false);
    }
  };

  const quiz = studyContent?.questions ?? [];
  const correctCount = quiz.reduce((total, question, index) => total + (answers[index] === 0 ? 1 : 0), 0);

  return (
    <div className="app">
      <style>{`
        .sm-page { max-width: 1160px; margin: 0 auto; padding: 52px 26px 90px; min-height: 65vh; }
        .sm-title { font-family: "Playfair Display", Georgia, serif; font-size: clamp(34px, 4vw, 54px); font-weight: 500; margin: 8px 0 18px; }
        .sm-card { background: #fffdfa; border: 1px solid #e8d9c7; border-radius: 22px; padding: 25px; }
        .sm-nav { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
        .sm-nav button { border: 0; background: transparent; padding: 12px 15px; border-radius: 25px; cursor: pointer; font: inherit; color: #655c52; }
        .sm-nav button.selected { background: #f2e9dc; color: #302821; }
        .sm-timer { font-family: "Playfair Display", Georgia, serif; font-size: clamp(60px, 10vw, 100px); font-variant-numeric: tabular-nums; line-height: 1.2; color: #302821; }
        .sm-library-page { max-width:1160px; }
        .sm-library-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:24px; }
        .sm-library-heading .sm-title { margin:4px 0; }
        .sm-library-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
        .sm-library-card { display:flex; flex-direction:column; min-width:0; min-height:218px; text-align:left; border:1px solid #e9d8c3; border-radius:17px; background:#fffdfa; padding:20px; cursor:pointer; font:inherit; color:#302821; transition:box-shadow .2s, transform .2s; }
        .sm-library-card:hover { transform:translateY(-2px); box-shadow:0 10px 24px #4b372313; }
        .sm-library-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
        .sm-document-icon { width:40px; height:40px; border-radius:12px; background:#f3e9da; display:inline-flex; align-items:center; justify-content:center; color:#ae8c61; font-size:22px; }
        .sm-doc-badge { font-size:11px; border-radius:20px; padding:6px 11px; }
        .sm-doc-badge.exam { background:#eee9e2; color:#95694d; }
        .sm-doc-badge.course { background:#edf3e9; color:#47734c; }
        .sm-library-card h3 { font-size:16px; font-weight:500; margin:17px 0 6px; line-height:1.4; }
        .sm-library-desc { color:#856b5b; font-size:14px; line-height:1.65; margin:0 0 16px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .sm-library-card-bottom { margin-top:auto; padding-top:13px; border-top:1px solid #eee4d8; display:flex; justify-content:space-between; color:#b09377; font-size:12px; }
        .sm-library-card-bottom span:last-child { font-size:19px; line-height:1; }
        .sm-library-empty { text-align:center; border:1px dashed #e5d4bf; background:#fffdfa; border-radius:18px; padding:55px 25px; color:#856b5b; }
        .sm-library-empty h2 { font-family:Georgia,serif; font-weight:400; color:#302821; }
        .sm-library-empty p { max-width:440px; margin:12px auto 25px; line-height:1.6; }
        .sm-calendar { display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 6px; }
        .sm-day { border: 0; background: transparent; min-height: 64px; border-radius: 14px; cursor: pointer; font: inherit; color: #473a2f; }
        .sm-muted-day { display:flex; justify-content:center; align-items:center; color:#cbb8a6; }
        .sm-day.selected { background: #302821; color: white; }
        .sm-day.has-plan:not(.selected) { background: #f2e9dc; }
        .sm-planner-top { display:flex; justify-content:space-between; align-items:center; gap:18px; flex-wrap:wrap; }
        .sm-planner-columns { display:grid; grid-template-columns:1.3fr 1fr; gap:16px; }
        .sm-planner-columns .sm-card { min-width:0; }
        .sm-day { min-height:69px; position:relative; }
        .sm-day.has-plan::after { content:""; width:5px; height:5px; background:#b28b60; border-radius:50%; position:absolute; bottom:9px; left:calc(50% - 2.5px); }
        .sm-outline-btn { border:1px solid #e8d9c7; border-radius:30px; background:#fffdfa; padding:12px 18px; color:#302821; font:inherit; cursor:pointer; }
        .sm-outline-btn:hover { background:#f3e9db; }
        .sm-focus { text-align:center; padding:30px; margin-top:24px; }
        .sm-focus-heading { font-family:"Playfair Display",Georgia,serif; font-size:36px; font-weight:400; margin:5px 0 10px; }
        .sm-focus-description { color:#927b66; margin:0 auto; max-width:460px; line-height:1.6; }
        .sm-timer-panel { background:#f7f1e8; border-radius:20px; padding:26px 16px; margin:24px auto; max-width:560px; }
        .sm-timer-panel p:last-child { color:#947b64; margin:10px 0 0; }
        .sm-focus-actions { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-top:15px; }
        .sm-modal-overlay { position:fixed; inset:0; background:rgba(34,27,22,.38); z-index:1000; display:flex; justify-content:flex-end; }
        .sm-modal { background:#fffdfa; width:min(100%,480px); height:100%; overflow:auto; box-sizing:border-box; padding:28px; box-shadow:-8px 0 35px #30282122; }
        .sm-modal h2 { font-family:"Playfair Display",Georgia,serif; font-weight:400; margin:0 0 24px; font-size:26px; }
        .sm-form-label { display:block; color:#8e7762; font-size:13px; margin:18px 0 8px; }
        .sm-form-input { width:100%; box-sizing:border-box; border:1px solid #e6d4be; background:white; border-radius:13px; padding:13px; font:inherit; color:#302821; }
        .sm-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .sm-celebrate { position:fixed; inset:0; z-index:1100; pointer-events:none; overflow:hidden; }
        .sm-confetti { position:absolute; top:-30px; width:10px; height:16px; border-radius:2px; animation:smFall 3.4s ease-in forwards; }
        @keyframes smFall { 0% { transform:translateY(-10vh) rotate(0deg); opacity:1; } 100% { transform:translateY(115vh) rotate(850deg); opacity:0; } }
        .sm-congrats { position:fixed; z-index:1101; bottom:26px; left:50%; transform:translateX(-50%); background:#302821; color:white; border-radius:20px; padding:18px 24px; box-shadow:0 8px 28px #30282144; text-align:center; max-width:calc(100vw - 40px); }
        @media(max-width:850px) { .sm-planner-columns { grid-template-columns:1fr; } }

        @media(max-width:760px) { .sm-library-grid { grid-template-columns:1fr; } .sm-page { padding: 28px 16px 60px; } .sm-day { min-height: 43px; } }
      `}</style>
      <style>{`@keyframes studyStarTurn { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <header className="navbar">
        <a href="/" className="brand" onClick={(e) => { e.preventDefault(); goTo("home"); setActiveTab("Overview"); }}>
          <span className="brand-icon">♧</span><span>StudyMind AI</span>
        </a>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? "✕" : "☰"}
        </button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <div className="sm-nav">
            {[ ["home", "Accueil"], ["library", "My library"], ["calendar", "Calendar"], ["focus", "Focus timer"], ["ai", "Ask AI"] ].map(([id,label]) => <button key={id} className={page === id ? "selected" : ""} onClick={() => goTo(id)}>{label}</button>)}
            <button className="button button-dark" onClick={scrollToUpload}>+ New upload</button>
          </div>
        </nav>
      </header>

      {page === "home" && <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="welcome-pill"><span className="sparkle">✧</span>Your cosy study companion</div>
            <h1>Turn your course<br />into a cosy little<br /><span className="highlight">study kit</span></h1>
            <p className="hero-description">Drop in a lecture, a chapter or last year's exam. StudyMind helps organise your material into revision notes, flashcards and a practice quiz.</p>
            <div className="hero-buttons">
              <button className="button button-dark" onClick={scrollToUpload}>Add your material <span className="arrow">→</span></button>
              <button className="button button-light" onClick={() => goTo(studyContent ? "study" : "upload")}>My study kit</button>
            </div>
            <p className="small-print">PDF or text file <span>·</span> Paste your notes <span>·</span> Start for free</p>
          </div>
          <div className="hero-visual">
            <div className="paper-tape" />
            <article className="revision-card">
              <div className="revision-top"><span className="revision-label">REVISION SHEET</span><span className="coffee">♨</span></div>
              <h2>{studyContent ? "Your study kit" : "A little study kit"}</h2>
              <div className="paper-lines"><span /><span /><span /></div>
              <div className="must-know">
                <p className="mini-label">MUST KNOW</p>
                <ul>
                  {(studyContent?.summary.slice(0, 3) ?? ["Key concepts", "Definitions and examples", "Quick recall"]).map((item, index) => <li key={index}>{item.slice(0, 62)}{item.length > 62 ? "…" : ""}</li>)}
                </ul>
              </div>
              <div className="paper-footer">Key concepts · Quick recall</div>
            </article>
            <div className="floating-badge quiz-badge"><span className="check-icon">✓</span>{studyContent ? `${quiz.length} practice questions` : "Your pace, your way"}</div>
            <button className="floating-badge flashcard-badge" onClick={() => { setActiveTab("Flashcards"); goTo(studyContent ? "study" : "upload"); }}>
              <span className="flash-icon">♧</span>{studyContent ? `${studyContent.cards.length} study cards` : "Flashcards"}
            </button>
            <div className="visual-decoration">✳</div>
          </div>
        </section>

        <section className="reassurance"><span>LESS CRAMMING</span><span className="separator">✳</span><span>MORE UNDERSTANDING</span><span className="separator">✳</span><span>ZERO STUDY GUILT</span></section>

        <section className="features section" id="features">
          <div className="section-heading"><div><p className="eyebrow">YOUR TOOLS, ALL IN ONE PLACE</p><h2>Everything in one <em>little kit.</em></h2></div><p>One source, four ways to study. Choose what fits the moment you're in.</p></div>
          <div className="feature-grid">
            <article className="feature-card"><span className="feature-icon">✳</span><p className="feature-context">BEFORE CLASS</p><h3>Revision sheets</h3><p>Key concepts, definitions and examples organised into a readable study sheet.</p><a href="/upload">Give it a try ↗</a></article>
            <article className="feature-card sage"><span className="feature-icon">✧</span><p className="feature-context">5 MINUTE GAPS</p><h3>Practice quizzes</h3><p>Practise recalling ideas with questions based on the material you provide.</p><a href="/study">Give it a try ↗</a></article>
            <article className="feature-card peach"><span className="feature-icon">▤</span><p className="feature-context">ON THE BUS</p><h3>Flashcards</h3><p>Review key sentences with question-and-answer cards you can flip.</p><a href="/study">Give it a try ↗</a></article>
            <article className="feature-card"><span className="feature-icon">♡</span><p className="feature-context">EXAM WEEK</p><h3>Answer feedback</h3><p>Practise writing answers and compare them with key points from your course.</p><a href="/study">Give it a try ↗</a></article>
          </div>
        </section>

        <section className="how-section" id="how"><div className="section section-inner">
          <div className="section-heading"><div><p className="eyebrow">THREE STEPS, NO STUDY GUILT</p><h2>Small steps. <em>Clear head.</em></h2></div><p>Start with what you have. Build a little study habit from there.</p></div>
          <div className="steps-grid">
            <article className="step"><span className="step-number">01</span><div className="step-icon">↥</div><h3>Add your material</h3><p>Upload a supported file or paste your own notes.</p></article>
            <article className="step"><span className="step-number">02</span><div className="step-icon">✳</div><h3>Build your study kit</h3><p>Review a summary, key ideas, cards and practice questions.</p></article>
            <article className="step"><span className="step-number">03</span><div className="step-icon">↗</div><h3>Study a little, often</h3><p>Return to the material and practise at your own pace.</p></article>
          </div>
        </div></section>

        <section className="kindness section"><div><p className="eyebrow">A GENTLER WAY TO GET THERE</p><h2>You're a person, not a <em>productivity machine.</em></h2><p className="kindness-intro">Studying is hard enough. Your tools should meet you where you are, not make you feel behind.</p></div>
          <div className="kindness-list"><article><span>☾</span><div><h3>For the 11pm panic</h3><p>Start with one chapter instead of the whole syllabus.</p></div></article><article><span>↗</span><div><h3>Looks fine on your phone</h3><p>Keep the same calm layout on a small screen.</p></div></article><article><span>♡</span><div><h3>Feedback, not judgement</h3><p>Focus on what you know and what to review next.</p></div></article></div>
        </section>

      </main>}
      {page === "upload" && <main>
        <section className="upload-section" id="upload"><div className="upload-card">
          <span className="upload-flower">✳</span><p className="eyebrow">YOUR NEXT SMALL STEP</p><h2>One chapter is enough <em>to start.</em></h2>
          <p className="upload-description">Choose a document or paste your notes to begin your study kit.</p>
          <label className="upload-drop">
            <input type="file" accept=".pdf,.docx,.pptx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => { setFile(event.target.files?.[0] || null); setMessage(""); }} />
            <span className="upload-icon">↥</span><strong>{file ? file.name : "Choose a PDF, Word, PowerPoint or text file"}</strong><span className="upload-hint">PDF · Word (.docx) · PowerPoint (.pptx) · TXT</span>
          </label>
          <div style={{ marginTop: 18, textAlign: "left" }}>
            <label htmlFor="course-text" style={{ display: "block", marginBottom: 9, color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>Or paste your course here</label>
            <textarea id="course-text" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste your notes, lesson, exercise or exam statement…" rows={5} style={{ width: "100%", resize: "vertical", padding: 15, borderRadius: 12, border: "1px solid var(--line)", background: "#fffdfa", color: "var(--ink)", font: "inherit" }} />
          </div>
          <button className="button button-dark upload-button" onClick={() => pasteText.trim() ? processText(pasteText, "Texte collé") : handleFile()} disabled={processing}>
            {processing ? "Reading your material..." : "Build my study kit"} <span className="arrow">→</span>
          </button>
          {processing && <div role="status" aria-live="polite" style={{ marginTop: 24, padding: "24px 18px", border: "1px solid #e8d9c7", borderRadius: 20, background: "#fffdfa", textAlign: "center" }}>
            <style>{`@keyframes studyMindSpin { to { transform: rotate(360deg); } } @keyframes studyMindPulse { 0%,100% { opacity:.45; transform:scale(.96); } 50% { opacity:1; transform:scale(1); } }`}</style>
            <div style={{ width: 46, height: 46, margin: "0 auto 14px", border: "3px solid #eadfce", borderTopColor: "#a88761", borderRadius: "50%", animation: "studyMindSpin 1s linear infinite" }} />
            <p style={{ margin: "0 0 7px", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: "#302821" }}>On prépare ton espace de révision…</p>
            <p style={{ margin: "0 auto 18px", maxWidth: 440, color: "#9b8875", lineHeight: 1.6, fontSize: 14 }}>Lecture du document et organisation du texte. Cela peut prendre quelques instants.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>{["Lecture du cours", "Repérage des idées", "Préparation des supports"].map((step, i) => <span key={step} style={{ borderRadius: 24, padding: "8px 12px", background: "#f6f0e6", color: "#8b6b4d", fontSize: 12, animation: `studyMindPulse 1.5s ease-in-out ${i * .2}s infinite` }}>✳ {step}</span>)}</div>
          </div>}
          {message && <p className="file-message" role="status">{message}</p>}
        </div></section>

      </main>}
      {page === "study" && <main>
        {studyContent && <section className="section" id="study-kit" style={{ paddingTop: 65, paddingBottom: 80 }}>
          <div className="section-heading"><div><p className="eyebrow">YOUR PERSONAL STUDY SPACE</p><h2>Your study <em>kit.</em></h2></div><div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}><p style={{ margin: 0 }}>Built from your provided material. Review the source when you need more context.</p><button className="button button-light" onClick={() => { setStudyContent(null); setExamGenerated(false); setExamError(""); setExamGradeResult(null); setExamGradeError(""); setSourceText(""); setRevisionSheetAI(""); setRevisionSheetError(""); setFile(null); setPasteText(""); setMessage(""); setActiveTab("Overview"); setCardIndex(0); setFlipped(false); setAnswers({}); setWrittenAnswers({}); setShowResults(false); goTo("upload"); }} style={{ borderRadius: 28, padding: "10px 18px" }}><span style={{ display: "inline-block", marginRight: 8, animation: "studyStarTurn 3s linear infinite" }}>✧</span>New analysis</button></div></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 24 }}>
            {studyTabs.map((tab) => <button key={tab} className={`button ${activeTab === tab ? "button-dark" : "button-light"}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}
          </div>
          <div style={{ padding: "clamp(20px, 4vw, 36px)", background: "#fffdfa", border: "1px solid var(--line)", borderRadius: 22 }}>
            {activeTab === "Overview" && <div><p className="eyebrow">OVERVIEW</p><h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 500 }}>Your course at a glance</h3><p style={{ color: "var(--muted)", lineHeight: 1.8 }}>This overview is organised from the text you supplied. It is not an AI-generated summary yet.</p><ul style={{ lineHeight: 1.9 }}>{studyContent.summary.map((item, index) => <li key={index}>{item}</li>)}</ul><p style={{ color: "var(--muted)", fontSize: 13 }}>Source length: {sourceText.length.toLocaleString()} characters.</p></div>}
            {activeTab === "Revision sheet" && <article style={{maxWidth:850,margin:"0 auto",background:"#fffdf9",border:"1px solid #e8d9c7",borderRadius:16,padding:"clamp(18px,4vw,34px)",color:"#302821"}}>
              <p className="eyebrow">FICHE DE RÉVISION INTELLIGENTE</p>
              <h3 style={{fontFamily:"'Playfair Display', Georgia, serif",fontSize:"clamp(24px,3vw,32px)",fontWeight:500,margin:"9px 0"}}>Ta fiche de révision</h3>
              <p style={{color:"#8f7b68",lineHeight:1.7,marginTop:0}}>StudyMind AI transforme ton cours en une fiche structurée : notions essentielles, définitions claires, formules mises en valeur et exemples. Vérifie les formules dans le document original.</p>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"20px 0"}}>
                <button className="button button-dark" onClick={generateRevisionSheetAI} disabled={revisionSheetLoading || !sourceText.trim()}>{revisionSheetLoading?"Création de ta fiche en cours…":revisionSheetAI?"↻ Régénérer avec l'IA":"✳ Générer ma fiche avec l'IA"}</button>
                {revisionSheetAI && <button className="button button-light" onClick={()=>navigator.clipboard?.writeText(revisionSheetAI)}>Copier la fiche</button>}
              </div>
              {revisionSheetLoading && <div role="status" style={{padding:20,background:"#faf5eb",border:"1px solid #e8d9c7",borderRadius:17,color:"#806348"}}>
                <strong>Création de ta fiche de révision…</strong>
                <p style={{margin:"7px 0 14px",fontSize:14}}>Nous organisons les concepts et les formules importantes de ton cours.</p>
                <div className="sm-ai-skeleton" style={{width:"83%"}}/><div className="sm-ai-skeleton" style={{width:"96%"}}/><div className="sm-ai-skeleton" style={{width:"64%"}}/>
              </div>}
              {revisionSheetError && <p role="alert" style={{padding:16,background:"#fff2ed",color:"#9a533f",borderRadius:12}}>{revisionSheetError}</p>}
              {revisionSheetAI ? <>
                <div style={{height:1,background:"#e8d9c7",margin:"20px 0"}} />
                <RevisionMarkdown content={revisionSheetAI}/>
                <p style={{marginTop:25,paddingTop:12,borderTop:"1px solid #e8d9c7",color:"#8f7b68",fontSize:12}}>{revisionSheetSource}</p>
              </> : !revisionSheetLoading && <div style={{padding:"25px 20px",background:"#f8f1e8",borderRadius:14,color:"#8e7a68",textAlign:"center"}}>Clique sur « Générer ma fiche avec l'IA » pour obtenir une vraie fiche rédigée. L'ancienne extraction automatique désorganisée n'est plus affichée.</div>}
            </article>}
            {activeTab === "Flashcards" && <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:22}}>
                <div><p className="eyebrow" style={{margin:0}}>FLASHCARDS INTELLIGENTES</p>
                  <p style={{color:"#806b56",fontSize:14,margin:"8px 0 0"}}>Révise ton cours avec des questions et des réponses ciblées.</p></div>
                <button type="button" className="button button-dark" onClick={generateFlashcardsAI} disabled={flashcardsLoading || !sourceText.trim()}>
                  {flashcardsLoading ? "Création des cartes…" : flashcardsGenerated ? "↻ Régénérer avec l’IA" : "✦ Générer avec l’IA"}
                </button>
              </div>
              {flashcardsLoading && <p role="status" style={{padding:16,background:"#f8f0e4",borderRadius:14,color:"#765a40"}}>StudyMind sélectionne les notions et prépare tes cartes…</p>}
              {flashcardsError && <p role="alert" style={{padding:16,background:"#fff2ed",borderRadius:14,color:"#9a533f"}}>{flashcardsError}</p>}
              {!flashcardsGenerated && <p style={{fontSize:13,color:"#98836c"}}>Les cartes porteront sur les définitions, méthodes et exemples du cours, jamais sur les titres ou les dates des diapositives.</p>}
              {studyContent.cards.length ? <div style={{ maxWidth: 900, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18, color: "#9b8875", fontSize: 14 }}>
                  <span>Card {cardIndex + 1} of {studyContent.cards.length}</span>
                  <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                    <button onClick={() => { const shuffled = [...studyContent.cards].sort(() => Math.random() - 0.5); setStudyContent({ ...studyContent, cards: shuffled }); setCardIndex(0); setFlipped(false); }} style={{ border: 0, background: "transparent", color: "#9b8875", cursor: "pointer", font: "inherit" }}>⤨ Shuffle</button>
                    <button onClick={() => { setStudyContent({ ...studyContent, cards: [] }); setFlashcardsGenerated(false); setFlashcardsError(""); setCardIndex(0); setFlipped(false); }} style={{ border: 0, background: "transparent", color: "#9b8875", cursor: "pointer", font: "inherit" }}>↶ Reset</button>
                  </div>
                </div>
                <button onClick={() => setFlipped(!flipped)} aria-label="Retourner la flashcard" style={{ boxSizing: "border-box", display: "block", width: "100%", minHeight: 335, padding: "clamp(26px, 5vw, 48px)", textAlign: "left", borderRadius: 28, border: "1px solid #e8d9c7", background: flipped ? "#f0f1e8" : "#fffdfa", color: "#302821", cursor: "pointer", font: "inherit", boxShadow: "0 2px 5px rgba(70, 50, 30, 0.015)" }}>
                  <span style={{ display: "block", color: "#a58a6e", letterSpacing: "0.18em", fontSize: 12, marginBottom: 48 }}>{flipped ? "ANSWER" : "QUESTION"}</span>
                  <span style={{ display: "block", fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(24px, 3vw, 32px)", lineHeight: 1.45, margin: "0 0 34px 10px" }}>{flipped ? studyContent.cards[cardIndex].answer : studyContent.cards[cardIndex].question}</span>
                  <span style={{ display: "block", color: "#b39a81", fontSize: 14, marginLeft: 10 }}>{flipped ? "Click the card to see the question" : "Click the card to reveal the answer"}</span>
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginTop: 24 }}>
                  <button className="button button-light" style={{ justifySelf: "start", borderRadius: 28, padding: "12px 22px" }} onClick={() => { setCardIndex((cardIndex - 1 + studyContent.cards.length) % studyContent.cards.length); setFlipped(false); }}>‹ &nbsp; Previous</button>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", justifyContent: "center" }}>{studyContent.cards.map((_, index) => <button key={index} aria-label={`Aller à la carte ${index + 1}`} onClick={() => { setCardIndex(index); setFlipped(false); }} style={{ width: index === cardIndex ? 24 : 8, height: 8, padding: 0, border: 0, borderRadius: 20, background: index === cardIndex ? "#a88761" : "#e3d4c2", cursor: "pointer" }} />)}</div>
                  <button className="button button-dark" style={{ justifySelf: "end", borderRadius: 28, padding: "12px 22px" }} onClick={() => { setCardIndex((cardIndex + 1) % studyContent.cards.length); setFlipped(false); }}>Next &nbsp; ›</button>
                </div>
              </div> : <p>Aucune carte pour le moment. Clique sur « Générer avec l’IA » pour commencer.</p>}
            </div>}
            {activeTab === "Practice exam" && <div>
              <p className="eyebrow">EXAMEN BLANC INTELLIGENT</p>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 500 }}>Teste tes connaissances</h3>
              <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Les questions portent sur les connaissances et méthodes du cours, jamais sur ses titres ou sa mise en page.</p>
              <button type="button" className="button button-dark" onClick={generateExamAI} disabled={examLoading || !sourceText.trim()}>
                {examLoading ? "Préparation de ton examen…" : examGenerated ? "↻ Régénérer l'examen" : "✦ Générer un examen avec l'IA"}
              </button>
              {examError && <p role="alert" style={{padding:16,marginTop:18,background:"#fff2ed",borderRadius:14,color:"#9a533f"}}>{examError}</p>}
              {examLoading && <p role="status" style={{padding:16,marginTop:18,background:"#f8f0e4",borderRadius:14,color:"#765a40"}}>StudyMind prépare les questions et leurs réponses attendues…</p>}
              {!examGenerated && <p style={{padding:24,marginTop:20,background:"#f8f1e8",borderRadius:14,color:"#806b56"}}>Clique sur « Générer un examen avec l'IA » pour obtenir des questions utiles et pertinentes.</p>}
              {examGenerated && quiz.map((question,index) => <article key={index} style={{background:"#fffdfa",border:"1px solid #e8d9c7",borderRadius:18,padding:"clamp(18px,3vw,28px)",margin:"20px 0"}}>
                <div style={{display:"flex",gap:12,alignItems:"start",marginBottom:16}}>
                  <span style={{color:"#a27e5d",fontWeight:700}}>{index+1}.</span>
                  <h4 style={{margin:0,fontSize:18,lineHeight:1.5}}>{question.question}</h4>
                </div>
                <textarea aria-label={`Réponse à la question ${index+1}`} value={writtenAnswers[index]||""} onChange={event=>{setWrittenAnswers({...writtenAnswers,[index]:event.target.value});setShowResults(false);setExamGradeResult(null);}} placeholder="Écris ta réponse ici…" rows={5} style={{boxSizing:"border-box",width:"100%",padding:16,borderRadius:14,border:"1px solid #ead9c7",background:"#fff",color:"var(--ink)",font:"inherit",resize:"vertical"}} />
                {showResults && examGradeResult?.corrections?.[index] && <div style={{background:"#f8f1e8",borderRadius:12,padding:18,marginTop:14,lineHeight:1.65}}>
                  <strong>{examGradeResult.corrections[index].status === "graded" ? `Correction proposée · ${examGradeResult.corrections[index].score}/5` : "Correction à vérifier"}</strong>
                  <p>{examGradeResult.corrections[index].feedback}</p>
                  {examGradeResult.corrections[index].missing && <p><strong>À améliorer :</strong> {examGradeResult.corrections[index].missing}</p>}
                  <p style={{marginBottom:0}}><strong>Réponse attendue :</strong> {examGradeResult.corrections[index].expected}</p>
                </div>}
              </article>)}
              {examGenerated && <button className="button button-dark" disabled={examGrading} onClick={finishPracticeExam}>{examGrading ? "Correction de tes réponses…" : "Terminer l'examen et voir ma correction"}</button>}
              {examGradeError && <p role="alert" style={{padding:16,marginTop:16,background:"#fff2ed",borderRadius:14,color:"#9a533f"}}>{examGradeError}</p>}
              {examGenerated && showResults && examGradeResult && <div role="status" style={{marginTop:18,padding:22,background:"#f4eadb",borderRadius:18,color:"#5a4633"}}>
                <h3 style={{marginTop:0}}>Bilan de ton examen</h3>
                <p style={{fontSize:20,fontWeight:700}}>{examGradeResult.complete ? `${examGradeResult.score} / ${examGradeResult.maximum} points` : "Certaines réponses nécessitent une vérification"}</p>
                <p style={{fontSize:13,lineHeight:1.6,marginBottom:0}}>{examGradeResult.notice}</p>
              </div>}
            </div>}
          </div>
        </section>}
      </main>}
      {page === "library" && <section className="sm-page sm-library-page">
        <p className="eyebrow">MY LIBRARY</p>
        <div className="sm-library-heading">
          <h1 className="sm-title">Your documents</h1>
          <button className="button button-dark" onClick={scrollToUpload}>＋ New upload</button>
        </div>
        {storageWarning && <p role="alert" style={{color:"#9a533f"}}>{storageWarning}</p>}
        {documents.length > 4 && <input aria-label="Rechercher un document" className="sm-form-input" style={{maxWidth:400,marginBottom:20}} placeholder="Rechercher un document…" value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} />}
        <div className="sm-library-grid">
          {documents.filter(d => d.title.toLowerCase().includes(librarySearch.toLowerCase())).map(doc =>
            <button type="button" className="sm-library-card" key={doc.id} onClick={() => {
              setSourceText(doc.source || ""); setRevisionSheetAI(""); setRevisionSheetError("");
              setStudyContent(makeStudyContent(doc.source || doc.description || doc.title));
              setFlashcardsGenerated(false); setFlashcardsError(""); setExamGenerated(false); setExamError(""); setExamGradeResult(null); setExamGradeError("");
              setActiveTab("Overview"); setCardIndex(0); setFlipped(false);
              setAnswers({}); setWrittenAnswers({}); setShowResults(false);
              goTo("study");
            }}>
              <div className="sm-library-card-top"><span className="sm-document-icon">{doc.category === "Written exam" ? "✎" : "▤"}</span><span className={`sm-doc-badge ${doc.category === "Written exam" ? "exam" : "course"}`}>{doc.category || "Course"}</span></div>
              <h3>{doc.title}</h3>
              <p className="sm-library-desc">{doc.description || "Document importé dans StudyMind AI."}</p>
              <div className="sm-library-card-bottom"><span>{new Date(doc.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span><span aria-hidden="true">→</span></div>
            </button>
          )}
        </div>
        {!documents.length && <div className="sm-library-empty"><span className="sm-document-icon">▤</span><h2>Your library is waiting</h2><p>Importe ton premier cours pour le retrouver ici, avec sa fiche de révision, ses flashcards et son examen.</p><button className="button button-dark" onClick={scrollToUpload}>＋ New upload</button></div>}
        {!!documents.length && !documents.some(d=>d.title.toLowerCase().includes(librarySearch.toLowerCase())) && <p>Aucun document ne correspond à cette recherche.</p>}
      </section>}
      {page === "ai" && <section className="sm-page" style={{maxWidth:1100,margin:"0 auto"}}>
        <p className="eyebrow">STUDYMIND AI · ASSISTANT DE RÉVISION</p>
        <h1 className="sm-title">Ask StudyMind AI</h1>
        <p style={{color:"#8b7562",maxWidth:740,lineHeight:1.7}}>Pose tes questions sur tes cours ou explore des ressources pédagogiques en ligne, avec des explications claires et des sources consultables.</p>
        <form onSubmit={askCourseAI} className="sm-card" style={{padding:24,margin:"24px 0"}}>
          <label htmlFor="sm-ai-mode" className="sm-form-label">Sources de la réponse</label>
          <select id="sm-ai-mode" className="sm-form-input" value={aiMode} onChange={e=>setAiMode(e.target.value)} style={{maxWidth:350,marginBottom:17}}>
            <option value="auto">Automatique — Mes cours puis Web</option>
            <option value="course">Mes cours uniquement</option>
            <option value="web">Recherche Web</option>
          </select>
          <p style={{fontSize:12,color:"#927b64",margin:"0 0 17px"}}>{aiMode === "course" ? "Tes documents restent dans ton navigateur." : aiMode === "web" ? "Seule ta question est envoyée au service de recherche en ligne, jamais tes PDF." : "Si des passages de cours sont trouvés, ils sont prioritaires ; sinon une recherche Web est tentée."}</p>
          <label htmlFor="sm-ai-question" className="sm-form-label">Ta question</label>
          <textarea id="sm-ai-question" className="sm-form-input" rows={3} value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} placeholder="Ex. Explique la photosynthèse d'après mes cours." required />
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:14}}>
            <span style={{fontSize:13,color:"#917962"}}>{documents.length} document(s) dans ta bibliothèque</span>
            <button type="submit" className="button button-dark" disabled={aiLoading || !aiQuestion.trim()}>{aiLoading ? "Analyse locale…" : "Ask StudyMind AI →"}</button>
          </div>
        </form>
        {aiStatus && <p role="status" style={{padding:"12px 16px",background:"#f5eddf",borderRadius:12,color:"#725b46"}}>{aiStatus}</p>}
        {aiAnswer && <BeautifulAIAnswer answer={aiAnswer} />}
        {!!aiSources.length && <section className="sm-card" aria-label="Sources de recherche Web" style={{padding:24,margin:"16px 0",border:"1px solid #e9d9c4"}}>
          <h2 style={{font:"600 23px Georgia, serif",color:"#493520",margin:"0 0 10px"}}>Sources consultées</h2>
          <p style={{color:"#8e755b",fontSize:13,margin:"0 0 12px"}}>{aiSourceMode === "wikipedia" ? "Recherche encyclopédique (Wikipédia)" : "Résultats de recherche Web"} · Ces liens permettent de vérifier les informations.</p>
          <div style={{display:"grid",gap:11}}>{aiSources.map((source,i)=><div key={source.url+i} style={{border:"1px solid #eadcc9",background:"#fffaf3",padding:"13px 16px",borderRadius:12}}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" style={{fontWeight:700,color:"#84592c",textDecoration:"underline"}}>[W{i+1}] {source.title}</a>
            <p style={{fontSize:13,lineHeight:1.65,color:"#78624d",margin:"6px 0 0"}}>{source.snippet.length > 245 ? source.snippet.slice(0,245)+"…" : source.snippet}</p>
          </div>)}</div>
        </section>}
        <p style={{fontSize:13,color:"#967d66",marginTop:18}}>Les réponses peuvent comporter des erreurs. Vérifie les formules et les informations importantes dans le cours ou dans les sources consultées. Sans clé de recherche Web configurée, la recherche en ligne est limitée à Wikipédia.</p>
      </section>}
      {page === "calendar" && <section className="sm-page">
        <div className="sm-planner-top">
          <div><p className="eyebrow">STUDY RHYTHM</p>
            <h1 className="sm-title">Your study calendar</h1>
            <p style={{color:"#8b7562",maxWidth:480,lineHeight:1.6}}>Plan small sessions and tick them off. Quiet, steady progress is the whole point.</p>
          </div>
          <button className="button button-dark" onClick={() => setPlanModal(true)}>▦ &nbsp; Plan a session</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,margin:"24px 0 16px"}}>
          {[
            [plans.filter(p => p?.date?.slice(0,7) === new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset,1).toLocaleDateString("sv-SE").slice(0,7)).length,"SESSIONS THIS MONTH"],
            [plans.filter(p => p?.completed).length,"COMPLETED"],
            [sessions.filter(s => s?.kind === "Pomodoro").reduce((n,s) => n+(s.minutes||0),0),"MINUTES REVISED"]
          ].map(([n,label]) => <div className="sm-card" key={label} style={{padding:17}}>
            <div style={{display:"flex",alignItems:"center",gap:13}}><span className="sm-document-icon" style={{width:36,height:36,fontSize:18}}>{label === "COMPLETED" ? "✓" : label === "MINUTES REVISED" ? "◷" : "▦"}</span><div><span style={{fontFamily:"Georgia,serif",fontSize:25}}>{n}</span><p className="eyebrow" style={{margin:0}}>{label}</p></div></div>
          </div>)}
        </div>
        <div className="sm-planner-columns">
          <div className="sm-card">
            <div className="sm-planner-top" style={{marginBottom:25}}>
              <div><p className="eyebrow">YOUR MONTH</p><h2 style={{fontFamily:"Georgia,serif",fontWeight:400,margin:0}}>{new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset,1).toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</h2></div>
              <div style={{display:"flex",gap:6}}>
                <button className="sm-outline-btn" onClick={() => setMonthOffset(v => v-1)}>‹</button>
                <button className="sm-outline-btn" onClick={() => {setMonthOffset(0);setPlannedDate(new Date().toLocaleDateString("sv-SE"));}}>Today</button>
                <button className="sm-outline-btn" onClick={() => setMonthOffset(v => v+1)}>›</button>
              </div>
            </div>
            <div className="sm-calendar">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} style={{textAlign:"center",color:"#ac9277",fontSize:12,padding:"8px 0"}}>{d}</div>)}
              {Array.from({length:(new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset,1).getDay()+6)%7},(_,i) => <span key={"prev"+i} className="sm-day sm-muted-day">{new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset, i-((new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset,1).getDay()+6)%7)+1).getDate()}</span>)}
              {Array.from({length:new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset+1,0).getDate()},(_,i) => {
                const date = new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset,i+1);
                const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
                return <button key={key} className={`sm-day ${plannedDate===key?"selected":""} ${plans.some(p=>p?.date===key)?"has-plan":""}`} onClick={() => setPlannedDate(key)}>{i+1}</button>;
              })}
            </div>
          </div>
          <div className="sm-card">
            <div className="sm-planner-top">
              <div><p className="eyebrow">{new Date(/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) ? plannedDate+"T12:00:00" : new Date().toISOString()).toLocaleDateString("en-GB",{weekday:"long"}).toUpperCase()}</p>
                <h2 style={{fontFamily:"Georgia,serif",fontWeight:400,margin:0}}>{new Date(/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) ? plannedDate+"T12:00:00" : new Date().toISOString()).toLocaleDateString("en-GB",{day:"numeric",month:"long"})}</h2>
              </div>
              <button className="button button-dark" onClick={() => setPlanModal(true)}>+ Plan</button>
            </div>
            <div style={{marginTop:24}}>
              {plans.filter(p=>p?.date===plannedDate).map(p => <div key={p.id} style={{padding:16,marginBottom:10,borderRadius:14,background:"#f8f2e9"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                  <strong>{p.task}</strong><span style={{fontSize:12,color:"#947b64"}}>{p.time || "18:00"}</span>
                </div>
                <p style={{fontSize:13,color:"#937b65",margin:"8px 0"}}>{p.minutes || 25} min · {p.format || "Revision sheet"}</p>
                {p.notes && <p style={{fontSize:13,color:"#937b65"}}>{p.notes}</p>}
                <div style={{display:"flex",gap:12}}>
                  <button className="sm-outline-btn" onClick={() => setPlans(old=>old.map(x=>x.id===p.id?{...x,completed:!x.completed}:x))}>{p.completed?"✓ Terminée":"Marquer terminée"}</button>
                  <button className="sm-outline-btn" onClick={() => setPlans(old=>old.filter(x=>x.id!==p.id))}>Supprimer</button>
                </div>
              </div>)}
              {!plans.some(p=>p?.date===plannedDate) && <div style={{border:"1px dashed #e6d4be",borderRadius:16,background:"#fbf6ed",minHeight:285,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",textAlign:"center",padding:20}}>
                <span style={{fontSize:25,color:"#ad8c6a"}}>◷</span>
                <strong style={{margin:"14px 0 7px"}}>A quiet day</strong>
                <p style={{fontSize:14,color:"#977a60",maxWidth:260,lineHeight:1.6}}>Plan a short session — 25 minutes counts. Consistency beats long nights.</p>
                <button className="sm-outline-btn" onClick={() => {setPlanMinutes(25);setPlanModal(true);}}>Block 25 minutes</button>
              </div>}
            </div>
          </div>
        </div>
      </section>}
      {page === "focus" && <section className="sm-page" style={{maxWidth:980}}>
        <div style={{textAlign:"center",marginBottom:26}}>
          <p className="eyebrow">YOUR FOCUS SPACE</p>
          <h1 className="sm-title">One thing at a time.</h1>
          <p style={{color:"#8b7562",lineHeight:1.7,maxWidth:560,margin:"10px auto 0"}}>Choose your focus time, work peacefully, then enjoy a short break. Every minute counts.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginBottom:18}}>
          <article className="sm-card" style={{padding:20,textAlign:"center"}}>
            <p className="eyebrow">FOCUS SESSIONS</p>
            <strong style={{fontFamily:"Georgia,serif",fontSize:33,fontWeight:400}}>{sessions.filter(s=>s?.kind==="Pomodoro").length}</strong>
          </article>
          <article className="sm-card" style={{padding:20,textAlign:"center"}}>
            <p className="eyebrow">MINUTES REVISED</p>
            <strong style={{fontFamily:"Georgia,serif",fontSize:33,fontWeight:400}}>{sessions.filter(s=>s?.kind==="Pomodoro").reduce((n,s)=>n+(Number(s.minutes)||0),0)}</strong>
          </article>
        </div>
        {timer}
        <article className="sm-card" style={{marginTop:24,padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <div><p className="eyebrow">YOUR PROGRESS</p><h2 style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:400,margin:"7px 0"}}>Recent focus sessions</h2></div>
            <button className="sm-outline-btn" onClick={()=>goTo("calendar")}>Open study calendar →</button>
          </div>
          {sessions.filter(s=>s?.kind==="Pomodoro").length ? <div style={{display:"grid",gap:10,marginTop:16}}>
            {sessions.filter(s=>s?.kind==="Pomodoro").slice(0,5).map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",gap:10,background:"#f8f2e9",borderRadius:13,padding:"12px 16px"}}><span>{s.title || "Focus session"}</span><span style={{color:"#8b7562",fontSize:13}}>{Number(s.minutes)||0} min · {s.date && !Number.isNaN(new Date(s.date).getTime()) ? new Date(s.date).toLocaleDateString("fr-FR") : "Session"}</span></div>)}
          </div> : <p style={{color:"#8b7562",marginTop:16}}>No focus session yet. Start your first Pomodoro above.</p>}
        </article>
      </section>}
      {planModal && <div className="sm-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setPlanModal(false);}}>
        <div className="sm-modal" role="dialog" aria-modal="true" aria-label="Plan a study session">
          <div className="sm-planner-top"><h2>Plan a study session</h2><button className="sm-outline-btn" onClick={()=>setPlanModal(false)}>✕</button></div>
          <form onSubmit={e=>{e.preventDefault();addPlan();}}>
            <label className="sm-form-label">What are you working on?</label>
            <input className="sm-form-input" required value={plannedTask} onChange={e=>setPlannedTask(e.target.value)} placeholder="Photosynthesis — chapter 4"/>
            <div className="sm-form-grid">
              <div><label className="sm-form-label">Day</label><input className="sm-form-input" type="date" required value={plannedDate} onChange={e=>setPlannedDate(e.target.value)}/></div>
              <div><label className="sm-form-label">Start time</label><input className="sm-form-input" type="time" required value={planTime} onChange={e=>setPlanTime(e.target.value)}/></div>
              <div><label className="sm-form-label">Minutes</label><input className="sm-form-input" type="number" min="1" max="480" required value={planMinutes} onChange={e=>setPlanMinutes(e.target.value)}/></div>
              <div><label className="sm-form-label">Format</label><select className="sm-form-input" value={planFormat} onChange={e=>setPlanFormat(e.target.value)}>
                {["Revision sheet","Flashcards","Practice exam","Reading","Other"].map(v=><option key={v}>{v}</option>)}
              </select></div>
            </div>
            <label className="sm-form-label">Notes (optional)</label>
            <textarea className="sm-form-input" rows={4} value={planNotes} onChange={e=>setPlanNotes(e.target.value)} placeholder="Re-read the lesson, then 10 flashcards."/>
            <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:25}}>
              <button type="button" className="sm-outline-btn" onClick={()=>setPlanModal(false)}>Cancel</button>
              <button type="submit" className="button button-dark" disabled={!plannedTask.trim()}>Add to calendar</button>
            </div>
          </form>
        </div>
      </div>}
      {celebrate && <><div className="sm-celebrate">
        {Array.from({length:65},(_,i)=><span key={i} className="sm-confetti" style={{
          left:`${(i*73)%100}%`, background:["#b58b62","#f1d3a8","#8eac93","#e9a89b","#d9c0e8"][i%5],
          animationDelay:`${(i%12)*0.09}s`, animationDuration:`${2.5+(i%6)*0.3}s`
        }}/>)}
      </div><div className="sm-congrats">Bravo ! Session terminée 🎉 <button onClick={()=>setCelebrate(false)} style={{marginLeft:15,background:"transparent",color:"white",border:"1px solid #fff8",borderRadius:12,padding:7,cursor:"pointer"}}>Fermer</button></div></>}
      <footer className="footer" id="signin"><a href="/" className="brand"><span className="brand-icon">♧</span><span>StudyMind AI</span></a><span>© 2026 StudyMind AI</span><a href="/">A little progress still counts ↑</a></footer>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><StudyMindApp /></BrowserRouter>;
}
