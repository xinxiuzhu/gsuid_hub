import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Eye, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  logsApi,
  getApiErrorMessage,
  type ErrorReportDetail,
  type ErrorReportListPage,
} from '@/lib/api';

interface ReportQuery {
  page: number;
  per_page: number;
  search: string;
  level: string;
  start_date: string;
  end_date: string;
}

const INITIAL_QUERY: ReportQuery = {
  page: 1,
  per_page: 50,
  search: '',
  level: '',
  start_date: '',
  end_date: '',
};

export default function ErrorReportsPanel() {
  const { t } = useLanguage();
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState<ErrorReportListPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ErrorReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    logsApi
      .getErrorReports(query)
      .then((result) => {
        if (!cancelled) setPage(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPage(null);
          setError(getApiErrorMessage(err, t('logs.errorReportLoadFailed')));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, revision, t]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    logsApi
      .getErrorReport(selectedId, {
        start_date: query.start_date,
        end_date: query.end_date,
      })
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setDetailError(getApiErrorMessage(err, t('logs.errorReportLoadFailed')));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, query.start_date, query.end_date, t]);

  const totalPages = Math.max(1, Math.ceil((page?.count ?? 0) / query.per_page));
  const reportJson = detail ? JSON.stringify(detail.report, null, 2) : '';

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportJson);
      toast.success(t('logs.errorReportCopied'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('common.error')));
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery((current) => ({ ...current, page: 1, search: search.trim() }));
        }}
      >
        <Input
          className="h-9 w-full sm:w-72"
          value={search}
          placeholder={t('logs.searchErrorReports')}
          aria-label={t('logs.searchErrorReports')}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button type="submit" variant="outline" size="sm" disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          {t('common.search')}
        </Button>
        <Select
          value={query.level || '__all__'}
          onValueChange={(value) => {
            setQuery((current) => ({
              ...current,
              page: 1,
              level: value === '__all__' ? '' : value,
            }));
          }}
        >
          <SelectTrigger className="h-9 w-32" aria-label={t('logs.errorReportLevel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('logs.all')}</SelectItem>
            <SelectItem value="error">ERROR</SelectItem>
            <SelectItem value="critical">CRITICAL</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          {t('logs.startDate')}
          <Input
            type="date"
            className="h-9 w-40"
            value={query.start_date}
            max={query.end_date || undefined}
            onChange={(event) => {
              setQuery((current) => ({ ...current, page: 1, start_date: event.target.value }));
            }}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('logs.endDate')}
          <Input
            type="date"
            className="h-9 w-40"
            value={query.end_date}
            min={query.start_date || undefined}
            onChange={(event) => {
              setQuery((current) => ({ ...current, page: 1, end_date: event.target.value }));
            }}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setRevision((current) => current + 1)}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </form>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('logs.errorReportsList', { count: page?.count ?? 0 })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : loading ? (
            <p role="status" className="py-8 text-center text-muted-foreground">
              {t('common.loading')}
            </p>
          ) : page?.rows.length ? (
            page.rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="destructive">{row.level.toUpperCase()}</Badge>
                    <Badge variant="outline">
                      {t('logs.errorReportCount', { count: row.count })}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{row.timestamp}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{row.event}</p>
                  <p className="break-all text-xs text-muted-foreground">
                    {row.pathname}
                    {row.lineno !== null ? `:${row.lineno}` : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectedId(row.id)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </Button>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-muted-foreground">{t('logs.noErrorReports')}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {t('common.pageInfo', { current: query.page, total: totalPages })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || query.page <= 1}
                onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('common.previousPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || query.page >= totalPages}
                onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              >
                {t('common.nextPage')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle>{t('logs.errorReportDetail')}</DialogTitle>
            <DialogDescription>{t('logs.errorReportAriaDesc')}</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p role="status">{t('common.loading')}</p>
          ) : detailError ? (
            <p role="alert" className="text-destructive">
              {detailError}
            </p>
          ) : detail ? (
            <div className="min-h-0 space-y-4 overflow-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{t('logs.errorReportCount', { count: detail.count })}</span>
                <Button variant="outline" size="sm" onClick={copyReport}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t('common.copy')}
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
                {reportJson}
              </pre>
              <h3 className="font-semibold">{t('logs.errorReportOccurrences')}</h3>
              <ul className="space-y-1 text-sm">
                {detail.occurrences.map((occurrence) => (
                  <li key={occurrence.filename}>{occurrence.timestamp}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
