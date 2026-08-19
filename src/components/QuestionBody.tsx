import type { Question } from "@/lib/types";

export function QuestionBody({ question }: { question: Question }) {
  return (
    <>
      <p className="whitespace-pre-line leading-relaxed">{question.prompt}</p>

      {question.table && (
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                {question.table.headers.map((h) => (
                  <th
                    key={h}
                    className="border border-border px-3 py-1.5 text-left bg-surface font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-border px-3 py-1.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imageUrl}
          alt={`Diagram for question ${question.number}`}
          className="question-image max-w-full max-h-80 mx-auto"
        />
      )}
    </>
  );
}
