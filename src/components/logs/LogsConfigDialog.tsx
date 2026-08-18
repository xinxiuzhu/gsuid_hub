import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MultiSelectChipGroup } from '@/components/ui/MultiSelectChipGroup';
import {
  DEFAULT_LOGS_CONFIG,
  LOG_LEVEL_VALUES,
  logsApi,
  logsConfigApi,
  sanitizeVisibleLevels,
} from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface LogsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FALLBACK_LEVEL_OPTIONS = LOG_LEVEL_VALUES.map((value) => ({
  value,
  label: value.toUpperCase(),
}));

export default function LogsConfigDialog({ open, onOpenChange }: LogsConfigDialogProps) {
  const { t } = useLanguage();
  const [levelOptions, setLevelOptions] = useState(FALLBACK_LEVEL_OPTIONS);
  const [visibleLevels, setVisibleLevels] = useState<string[]>(
    DEFAULT_LOGS_CONFIG.visible_levels,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [levels, config] = await Promise.all([
          logsApi.getLevels().catch(() => null),
          logsConfigApi.get(),
        ]);
        if (cancelled) return;

        // 后端 /api/logs/levels 含 UI 标志 `all`，配置里不持久化它
        const usable = (levels ?? []).filter((item) => item.value && item.value !== 'all');
        if (usable.length > 0) {
          setLevelOptions(usable.map(({ value, label }) => ({ value, label })));
        }
        setVisibleLevels(sanitizeVisibleLevels(config.visible_levels));
      } catch {
        if (!cancelled) toast.error(t('logsConfig.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, t]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await logsConfigApi.update({ visible_levels: visibleLevels });
      setVisibleLevels(sanitizeVisibleLevels(saved.visible_levels));
      toast.success(t('logsConfig.saveSuccess'));
      onOpenChange(false);
    } catch {
      toast.error(t('logsConfig.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [visibleLevels, onOpenChange, t]);

  const allSelected = visibleLevels.length === levelOptions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('logsConfig.title')}</DialogTitle>
          <DialogDescription>{t('logsConfig.subtitle')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t('logsConfig.fields.visibleLevels')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setVisibleLevels(
                    allSelected ? [] : levelOptions.map((option) => option.value),
                  )
                }
              >
                {allSelected ? t('logsConfig.deselectAll') : t('logsConfig.selectAll')}
              </Button>
            </div>

            <MultiSelectChipGroup
              options={levelOptions}
              value={visibleLevels}
              onValueChange={setVisibleLevels}
              allowEmpty
            />

            <p className="text-xs text-muted-foreground">
              {t('logsConfig.fields.visibleLevelsHint')}
            </p>

            {visibleLevels.length === 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>{t('logsConfig.emptyHint')}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('logsConfig.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('logsConfig.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
