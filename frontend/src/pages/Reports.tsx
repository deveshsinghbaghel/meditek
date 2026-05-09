import { Activity } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useReports } from '../hooks/useReports';
import { ReportSummary } from '../types/health';

export function ReportsPage() {
  const { reports, generating, error, generate, bufferCount, askQuestion, chatLoading } = useReports();
  const [question, setQuestion] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion) return;

    try {
      setChatError(null);
      const response = await askQuestion(nextQuestion);
      setChatAnswer(response.answer);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to ask question about reports.');
    }
  }

  return (
    <main className="reports-shell">
      <div className="reports-surface">
        <div className="reports-header">
          <h1 className="reports-title">Health Reports</h1>
          <button
            className="reports-generate-btn"
            onClick={generate}
            disabled={generating || bufferCount === 0}
          >
            {generating ? 'Generating...' : bufferCount === 0 ? 'Generate Report' : `${bufferCount} data points collected`}
          </button>
        </div>

        {error && <div className="reports-error">{error}</div>}

        <section className="reports-chat">
          <div className="reports-chat__header">
            <h2 className="reports-chat__title">Ask Across All Reports</h2>
            <p className="reports-chat__sub">Uses your Gemini API to answer questions from every saved report.</p>
          </div>
          <form className="reports-chat__form" onSubmit={handleAsk}>
            <input
              className="reports-chat__input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about trends, falls, risk, oxygen, temperature, or recommendations"
            />
            <button className="reports-chat__button" type="submit" disabled={chatLoading || reports.length === 0}>
              {chatLoading ? 'Asking...' : 'Ask'}
            </button>
          </form>
          {chatError && <div className="reports-error">{chatError}</div>}
          {chatAnswer && <div className="reports-chat__answer">{chatAnswer}</div>}
        </section>

        {reports.length === 0 ? (
          <div className="reports-empty">
            <Activity size={48} className="reports-empty__icon" />
            <p className="reports-empty__text">No reports generated yet.</p>
            <p className="reports-empty__sub">Click "Generate Report" to analyze the last 20 seconds of vitals data.</p>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ReportCard({ report, index }: { report: ReportSummary; index: number }) {
  const date = new Date(report.generated_at ?? Date.now());
  const scoreColor = report.risk_level === 'High' ? '#D85A30' : report.risk_level === 'Moderate' ? '#BA7517' : '#1D9E75';
  const riskBadgeClass = report.risk_level === 'High' ? 'risk-badge--high' : report.risk_level === 'Moderate' ? 'risk-badge--moderate' : 'risk-badge--low';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link to={`/reports/${report.id}`} className="report-card">
        <div className="report-card__header">
          <span className="report-card__date">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`risk-badge ${riskBadgeClass}`}>{report.risk_level}</span>
        </div>
        <div className="report-card__score-wrap">
          <div className="report-card__score" style={{ borderColor: scoreColor }}>
            <span className="report-card__score-num" style={{ color: scoreColor }}>{report.health_score}</span>
          </div>
        </div>
        <p className="report-card__summary">{report.text_summary ?? 'No summary available.'}</p>
      </Link>
    </motion.div>
  );
}
