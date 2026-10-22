/**
 * PayrollPage — staff salary dashboard.
 * Rich, card-based view: overview (gross / deductions / net with MoM trend),
 * this pay period, itemized breakdown, upcoming payday and payslip history.
 * HR/admin see a minimal placeholder (full HR workspace is separate).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  Download,
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Percent,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn, Badge, Button, Card, CardTitle, EmptyState, Input, PageHeader, StatTile } from "@swams/ui";
import { useSession } from "../../../hooks/useSession.js";
import { useCompensation, usePayslips } from "../hooks/usePayroll.js";
import { payrollScope } from "../scope.js";

const ICON_TONES = {
  gross: "bg-warning-soft text-warning-text",
  deductions: "bg-danger-soft text-danger-text",
  net: "bg-brand border brand",
};

export function PayrollPage() {
  const { t } = useTranslation("payroll");
  const { principal } = useSession();
  const scope = payrollScope(principal);
  const _isOrg = scope === "organization";
  const isStaff = principal?.role === "staff";

  const { rows: compensation = [] } =
    useCompensation({ scope: "self", enabled: isStaff });
  const { rows: payslips = [] } = usePayslips({ scope: "self", enabled: isStaff });

  // ── Filter state ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Distinct periods and statuses from payslip data for filter chips.
  const periods = Array.from(
    new Set(payslips.map((p) => p.periodId).filter(Boolean)),
  ).sort((a, b) => b.localeCompare(a)); // newest first
  const statuses = Array.from(new Set(payslips.map((p) => p.status).filter(Boolean)));

  // ── Filtered compensation ──────────────────────────────────────────────
  const query = searchQuery.trim().toLowerCase();
  const filtered = compensation.filter((row) => {
    const period = (row.period ?? "").toLowerCase();
    const matchesSearch =
      !query ||
      period.includes(query) ||
      (row.month ?? "").toLowerCase().includes(query);
    const matchesPeriod =
      selectedPeriod === "all" || (row.period ?? "") === selectedPeriod;
    const matchesStatus =
      selectedStatus === "all" ||
      (payslips.find((p) => p.employee.id === row.employee.id)?.status ?? "published") ===
        selectedStatus;
    return matchesSearch && matchesPeriod && matchesStatus;
  });

  const selfGross = compensation.reduce((sum, row) => sum + (row.basic ?? 0), 0);
  const selfDeductions = compensation.reduce(
    (sum, row) => sum + (row.deductions ?? 0),
    0,
  );
  const selfNet = selfGross - selfDeductions;

  const latest = compensation.length > 0 ? compensation[0] : null;
  const previous = compensation.length > 1 ? compensation[1] : null;
  const nextPayLabel = latest?.period ?? t("mySalary.soon");

  let netChange = 0;
  let netChangeLabel = "";
  if (previous) {
    const prevNet = (previous.basic ?? 0) - (previous.deductions ?? 0);
    netChange = selfNet - prevNet;
    netChangeLabel =
      netChange > 0
        ? `+${netChange.toLocaleString()}`
        : netChange < 0
          ? `${netChange.toLocaleString()}`
          : t("mySalary.noChange");
  }

  if (!isStaff) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("title")} sub={t("subtitle")} />
        <div className="flex items-center justify-center py-20">
          <div className="max-w-md text-center">
            <Badge tone="info">{t("admin.role")}</Badge>
            <p className="mt-3 text-text-muted">{t("admin.placeholder")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("mySalary.title")}
        sub={t("mySalary.subtitle")}
        className="mb-2"
      />

      {/* Salary Overview */}
      <Card className="p-6 border-l-4 border-brand shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} className="text-brand" />
            {t("mySalary.overview")}
          </CardTitle>
          <Badge tone="neutral">
            {t("mySalary.thisMonth")}
          </Badge>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatTile
            label={t("mySalary.gross")}
            value={selfGross.toLocaleString()}
            hint={t("mySalary.beforeDeductions")}
            icon={<DollarSign size={20} />}
            className={`${ICON_TONES.gross} hover:bg-warning-soft/[0.3] transition-colors cursor-default`}
          />
          <StatTile
            label={t("mySalary.deductions")}
            value={selfDeductions.toLocaleString()}
            hint={t("mySalary.taxAndDeductions")}
            icon={<Percent size={20} />}
            className={`${ICON_TONES.deductions} hover:bg-danger-soft/[0.3] transition-colors cursor-default`}
          />
          <StatTile
            label={t("mySalary.net")}
            value={selfNet.toLocaleString()}
            hint={
              netChangeLabel
                ? `${netChangeLabel} vs last month`
                : undefined
            }
            icon={<Wallet size={20} />}
            badge={
              netChange !== 0 ? (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    netChange > 0
                      ? "bg-success-soft text-success-text"
                      : "bg-danger-soft text-danger-text"
                  }`}
                >
                  {netChange > 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                  {Math.abs(netChange).toLocaleString()}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-sunken text-text-faint">
                  {t("mySalary.noChange")}
                </span>
              )
            }
            className={`${ICON_TONES.net} hover:bg-brand/[0.1] transition-colors cursor-default`}
          />
        </div>

        {/* Take-home highlight */}
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Shield size={18} className="text-text-muted shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-text-faint uppercase tracking-wider">
              {t("mySalary.takeHome")}
            </p>
            <p className="text-lg font-semibold text-text">
              {selfNet.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-medium ${
              netChange >= 0
                ? "text-success-text"
                : "text-danger-text"
            }`}>
              {netChange > 0 ? (
                <TrendingUp size={12} className="mr-1" />
              ) : netChange < 0 ? (
                <TrendingDown size={12} className="mr-1" />
              ) : null}
              {netChangeLabel || t("mySalary.noChange")}
            </span>
          </div>
        </div>
      </Card>

      {/* This Pay Period */}
      {latest ? (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-6">
            <CardTitle className="flex items-center gap-2">
              <Calendar size={18} className="text-brand" />
              {t("mySalary.thisPeriod")}
            </CardTitle>
            <Badge tone="success">{t("mySalary.statusPublished")}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border border-border rounded-xl bg-surface">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-faint uppercase tracking-wider">
                  {t("mySalary.period")}
                </p>
                <span className="w-2 h-2 rounded-full bg-brand" />
              </div>
              <p className="font-medium text-text">{latest.period ?? "—"}</p>
            </div>
            <div className="p-4 border border-border rounded-xl bg-surface">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-faint uppercase tracking-wider">
                  {t("mySalary.payDate")}
                </p>
                <span className="w-2 h-2 rounded-full bg-success-text" />
              </div>
              <p className="font-medium text-text">{nextPayLabel}</p>
            </div>
            <div className="p-4 border border-border rounded-xl bg-surface">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-faint uppercase tracking-wider">
                  {t("mySalary.gross")}
                </p>
                <DollarSign size={14} className="text-warning-text" />
              </div>
              <p className="font-medium text-text">
                {(latest.basic ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 border border-border rounded-xl bg-surface">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-faint uppercase tracking-wider">
                  {t("mySalary.net")}
                </p>
                <Wallet size={14} className="text-brand" />
              </div>
              <p className="font-medium text-text">
                {
                  ((latest.basic ?? 0) - (latest.deductions ?? 0)).toLocaleString()
                }
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Salary Breakdown */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-6">
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} className="text-brand" />
            {t("mySalary.breakdown")}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-success-text" />
            <span className="text-text-faint">{t("mySalary.itemized")}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings */}
          <div className="space-y-3 p-4 border border-border rounded-xl bg-surface-light">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success-text" />
                <h3 className="font-semibold text-text">{t("mySalary.earnings")}</h3>
              </div>
              <span className="text-xs font-semibold text-success-text">
                {(latest?.basic ?? selfGross).toLocaleString()}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text">{t("mySalary.basicSalary")}</span>
                <span className="font-medium text-text">
                  {(latest?.basic ?? selfGross).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text">{t("mySalary.allowances")}</span>
                <span className="font-medium text-text">
                  {t("mySalary.zero")}
                </span>
              </div>
            </div>
            <div className="border-t border-border pt-3 mt-2">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-text">{t("mySalary.totalEarnings")}</span>
                <span className="text-text font-bold">
                  {(latest?.basic ?? selfGross).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-3 p-4 border border-border rounded-xl bg-surface-light">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-danger-text" />
                <h3 className="font-semibold text-text">{t("mySalary.deductions")}</h3>
              </div>
              <span className="text-xs font-semibold text-danger-text">
                {(latest?.deductions ?? selfDeductions).toLocaleString()}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text">{t("mySalary.tax")}</span>
                <span className="font-medium text-text">
                  {t("mySalary.zero")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text">{t("mySalary.providentFund")}</span>
                <span className="font-medium text-text">
                  {t("mySalary.zero")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text">{t("mySalary.loanRepayment")}</span>
                <span className="font-medium text-text">
                  {t("mySalary.zero")}
                </span>
              </div>
            </div>
            <div className="border-t border-border pt-3 mt-2">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-text">{t("mySalary.totalDeductions")}</span>
                <span className="text-text font-bold">
                  {(latest?.deductions ?? selfDeductions).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Upcoming Salary */}
      {latest ? (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-6">
            <CardTitle className="flex items-center gap-2">
              <Clock size={18} className="text-brand" />
              {t("mySalary.upcoming")}
            </CardTitle>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 border border-border rounded-xl bg-surface">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-brand/[0.1] border border-brand/[0.2]">
                <Calendar size={20} className="text-brand" />
              </div>
              <div>
                <p className="font-medium text-text">{t("mySalary.nextPayDate")}</p>
                <p className="text-sm text-text-muted">{nextPayLabel}</p>
              </div>
            </div>
            <div className="flex-1"></div>
            <div className="text-right">
              <p className="text-xs text-text-faint uppercase tracking-wider">
                {t("mySalary.expectedNet")}
              </p>
              <p className="text-2xl font-bold text-text">
                {selfNet.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between pt-6 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<FileText size={14} />}
                className="w-full md:w-auto"
              >
                {t("mySalary.viewPayslip")}
              </Button>
              <Button variant="primary" size="sm" icon={<Download size={14} />}>
                {t("mySalary.download")}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Payslip History */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Banknote size={18} className="text-brand" />
            <CardTitle>{t("mySalary.history")}</CardTitle>
          </div>
          <div className="flex items-center justify-between w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3 sm:w-[260px]">
              <Search size={16} className="text-text-faint shrink-0" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("mySalary.search.placeholderPeriod")}
                className="h-10 text-sm pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPeriod("all")}
                className={cn(
                  "px-3 text-xs",
                  selectedPeriod === "all"
                    ? "bg-muted text-text-muted"
                    : "text-text",
                )}
              >
                {t("mySalary.filter.allPeriods")}
              </Button>
              {periods.map((period) => (
                <Button
                  key={period}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className={cn(
                    "px-3 text-xs",
                    selectedPeriod === period
                      ? "bg-brand text-brand-contrast"
                      : "text-text",
                  )}
                >
                  {period}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStatus("all")}
                className={cn(
                  "px-3 text-xs",
                  selectedStatus === "all"
                    ? "bg-muted text-text-muted"
                    : "text-text",
                )}
              >
                {t("mySalary.filter.allStatuses")}
              </Button>
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                  className={cn(
                    "px-3 text-xs",
                    selectedStatus === status
                      ? "bg-brand text-brand-contrast"
                      : "text-text",
                  )}
                >
                  {t(`mySalary.status.${status}`) ?? status}
                </Button>
              ))}
              {(
                searchQuery ||
                selectedPeriod !== "all" ||
                selectedStatus !== "all"
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedPeriod("all");
                    setSelectedStatus("all");
                  }}
                  className="px-3 text-xs text-text-faint hover:text-text"
                >
                  {t("mySalary.search.clear")}
                </Button>
              )}
            </div>
            {filtered.length > 0 && (
              <Badge tone="neutral">{filtered.length}</Badge>
            )}
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Wallet size={26} className="text-text-muted" />}
            title={
              searchQuery ||
              selectedPeriod !== "all" ||
              selectedStatus !== "all"
                ? t("mySalary.results.none")
                : t("mySalary.noPayslips")
            }
            body={
              searchQuery ||
              selectedPeriod !== "all" ||
              selectedStatus !== "all"
                ? undefined
                : t("mySalary.noPayslipsDesc")
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((row, idx) => {
              const isCurrent = idx === 0;
              const net = (row.basic ?? 0) - (row.deductions ?? 0);
              return (
                <div
                  key={row.id}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    isCurrent
                      ? "border border-brand bg-brand/[0.02]"
                      : "hover:bg-surface-sunken transition-colors cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrent ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                      ) : (
                        <ChevronRight size={14} className="text-text-faint" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">
                        {row.month ?? t("mySalary.payslip")}
                      </p>
                      <p className="text-xs text-text-muted">
                        {row.period ?? ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="font-medium text-text">
                        {t("mySalary.currencySymbol")} {net.toLocaleString()}
                      </p>
                      <p className="text-xs text-text-muted">
                        {t("mySalary.net")}
                      </p>
                    </div>
                    <Button
                      variant="quiet"
                      size="sm"
                      icon={<FileText size={12} />}
                      className="h-8 px-2.5"
                      aria-label={t("mySalary.view")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}