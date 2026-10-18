import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PreviewNotice, StatTile } from '@swams/ui';
import { useSession } from '../../../hooks/useSession.js';
import { PAY_PERIODS, RUN, deriveReport } from '../mocks/fixtures.js';
import { payrollScope, canProcessPayroll } from '../scope.js';

export function PayrollPage() {
  const { t } = useTranslation('payroll');
  const { t: tn } = useTranslation('nav');
  const { principal } = useSession();
  const [tab, setTab] = useState('processing');
  const scope = payrollScope(principal);
  const isOrg = scope === 'organization';
  const canManage = canProcessPayroll(principal);
  const period = PAY_PERIODS.find((p) => p.id === RUN.periodId) ?? PAY_PERIODS[0];
  const reportRows = deriveReport('register');
  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4"><div>
        <h1 className="text-xl md:text-2xl">{tn('payroll')}</h1>
        <p className="text-text-muted mt-1 text-sm">{t('subtitle')}</p>
      </div></header>
      <PreviewNotice />
      {!canManage && <div className="rounded-card border p-4 bg-surface-sunken"><p className="text-text-muted text-sm">{t('readOnly')}</p></div>}
      {!isOrg && <div className="rounded-card border p-4 bg-surface-sunken"><p className="text-text-muted text-sm">{t('selfScope')}</p></div>}
      <nav className="flex flex-wrap gap-2 text-sm font-medium border-b border-border pb-2">
        {['processing','structures','employees','payslips','claims','reports','settings',isOrg?null:'myPay',isOrg?null:'myClaims'].filter(Boolean).map((id)=>(
          <button key={id} onClick={()=>setTab(id)} className={`px-3 py-2 rounded-input text-sm ${tab===id?'bg-surface text-primary':'text-text-muted hover:text-text'}`}>{t(`tabs.${id}`)}</button>
        ))}
      </nav>
      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile label={t('totals.gross')} value={RUN.totals.gross.toLocaleString()} />
        <StatTile label={t('totals.deductions')} value={RUN.totals.deductions.toLocaleString()} />
        <StatTile label={t('totals.net')} value={RUN.totals.net.toLocaleString()} />
        <StatTile label={t('totals.employer')} value={RUN.totals.employerContributions.toLocaleString()} />
        <StatTile label={t('totals.headcount')} value={RUN.totals.headcount} />
      </section>
      {tab==='processing'&&(
        <section className="grid gap-4">
          <div className="rounded-card border p-5">
            <h2 className="text-base font-medium mb-4">{t('workflow.title',{period:period.label})}</h2>
            <p className="text-text-muted text-sm mb-4">{t('workflow.updatedAt',{when:RUN.updatedAt})}</p>
            <div className="flex flex-wrap gap-2">
              {['Draft','Inputs','Review','Approval','Finalize','Publish'].map((step,i)=>(
                <span key={step} className={`px-3 py-1.5 rounded-full text-xs font-medium ${i<3?'bg-success text-white':'bg-surface-sunken text-text-muted'}`}>{step}</span>
              ))}
            </div>
            <div className="mt-4 text-text-muted text-sm">
              {RUN.exceptions.length>0?`${t('exceptions.heading')}: ${RUN.exceptions.length} ${t('exceptions.none').toLowerCase()}`:t('exceptions.none')}
            </div>
          </div>
          {RUN.exceptions.length>0&&(
            <div className="rounded-card border p-5">
              <h3 className="text-sm font-medium mb-3">{t('exceptions.heading')}</h3>
              {RUN.exceptions.map((ex)=>(
                <div key={ex.id} className="flex items-start gap-3 mb-3">
                  <div className="mt-1 text-text-muted">{ex.employee.initials}</div>
                  <div className="flex-1"><p className="text-text-sm text-text">{ex.message}</p><p className="text-xs text-text-muted">{ex.code}</p></div>
                  {!canManage?null:<button className="text-primary underline">{t('exceptions.resolve')}</button>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {tab==='payslips'&&reportRows.length>0&&(
        <section className="grid gap-4">
          <div className="rounded-card border p-5">
            <h3 className="text-sm font-medium mb-3">{t('reports.types.register')}</h3>
            <table className="w-full text-left text-sm border-collapse">
              <thead><tr className="border-b border-border text-text-muted">
                <th className="pb-2">{t('reports.cols.employee')}</th>
                <th className="pb-2">{t('reports.cols.period')}</th>
                <th className="pb-2 text-right">{t('reports.cols.gross')}</th>
                <th className="pb-2 text-right">{t('reports.cols.deductions')}</th>
                <th className="pb-2 text-right">{t('reports.cols.net')}</th>
              </tr></thead>
              <tbody>
                {reportRows.slice(0,10).map((row)=>(
                  <tr key={row.employee} className="border-b border-border/50 last:border-0">
                    <td className="py-3 text-text">{row.employee}</td>
                    <td className="py-3 text-text">{row.period}</td>
                    <td className="py-3 text-right tabular-nums">{row.gross.toLocaleString()}</td>
                    <td className="py-3 text-right tabular-nums">{row.deductions.toLocaleString()}</td>
                    <td className="py-3 text-right tabular-nums">{row.net.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab==='payslips'&&reportRows.length===0&&<EmptyState title={t('reports.empty')} body={t('empty.self')}/>}
    </div>
  );
}