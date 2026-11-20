import { getAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const runId = resolvedParams.id;
  
  const db = getAdminClient();

  const [summaryRes, testsRes] = await Promise.all([
    db.from('run_summary').select('*').eq('run_id', runId).single(),
    db.from('test_results').select('*').eq('run_id', runId).order('name', { ascending: true })
  ]);

  const summary = summaryRes.data;
  const tests = testsRes.data || [];

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-center text-red-500">
        Resultados no encontrados o la ejecución aún no ha finalizado.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Informe de Ejecución</h1>
        <p className="text-gray-500 mb-6 font-mono text-sm">ID: {runId}</p>

        {/* Tarjetas de métricas del run_summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Total Tests</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Pasados</p>
            <p className="text-2xl font-bold text-green-600">{summary.passed}</p>
          </div>
          <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
            <p className="text-gray-500 text-sm">Fallados</p>
            <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
          </div>
          <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Tiempo (s)</p>
            <p className="text-2xl font-bold">{(summary.duration_ms / 1000).toFixed(1)}</p>
          </div>
        </div>

        {/* Detalle individual de test_results */}
        <div className="bg-white rounded shadow overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4">Test</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Duración</th>
                <th className="p-4">Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">
                    {test.name}
                    {test.error && <p className="text-red-500 text-sm mt-1">{test.error}</p>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                      ${test.status === 'passed' ? 'bg-green-100 text-green-800' : 
                        test.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}
                    `}>
                      {test.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">
                    {test.duration_ms ? (test.duration_ms / 1000).toFixed(1) + 's' : '-'}
                  </td>
                  <td className="p-4">
                    {test.evidence_url ? (
                      <a href={test.evidence_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                        Ver captura
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center flex gap-4 justify-center">
          <Link href="/" className="bg-gray-200 text-gray-800 px-6 py-2 rounded font-medium hover:bg-gray-300 transition">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}