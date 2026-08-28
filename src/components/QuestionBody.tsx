import type { Question } from "@/lib/types";

export function QuestionBody({ question }: { question: Question }) {
  return (
    <>
      {question.passage && (
        <div className="rounded-lg border border-border bg-surface/50 p-4 text-sm leading-relaxed whitespace-pre-line max-h-[45vh] overflow-y-auto">
          {question.passage}
        </div>
      )}

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

      {(question.imageUrl || question.optionsImageUrl) && (
        <div className="flex flex-wrap justify-center items-start gap-4">
          {question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.imageUrl}
              alt={`Diagram for question ${question.number}`}
              className="question-image max-w-full sm:max-w-[48%] max-h-72 w-auto object-contain mx-auto"
            />
          )}
          {question.optionsImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.optionsImageUrl}
              alt={`Answer options for question ${question.number}`}
              className="question-image max-w-full sm:max-w-[48%] max-h-72 w-auto object-contain mx-auto"
            />
          )}
        </div>
      )}
    </>
  );
}
