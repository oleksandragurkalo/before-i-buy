import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_SETTINGS } from '../config';
import { loadResource } from './loadResource';

// Postgres `numeric` columns come back from PostgREST as strings — convert
// back to numbers at the boundary, same as itemFromRow in useItems.js.
export function settingsFromRow(row) {
  return {
    hourlyRate: Number(row.hourly_rate),
    currency: row.currency,
    currencySymbol: row.currency_symbol,
    payPeriod: row.pay_period,
    payAmount: Number(row.pay_amount),
    payType: row.pay_type,
    taxRate: Number(row.tax_rate),
    hoursPerWeek: Number(row.hours_per_week),
  };
}

function settingsToRow(settings, userId) {
  return {
    user_id: userId,
    // list_name is retired in favor of the `lists` table (see useLists.js)
    // and no longer read anywhere in the app — this placeholder just keeps
    // writes satisfying the column's existing NOT NULL constraint without
    // resurrecting the old single-list concept.
    list_name: 'Waiting List',
    hourly_rate: settings.hourlyRate,
    currency: settings.currency,
    currency_symbol: settings.currencySymbol,
    pay_period: settings.payPeriod,
    pay_amount: settings.payAmount,
    pay_type: settings.payType,
    tax_rate: settings.taxRate,
    hours_per_week: settings.hoursPerWeek,
  };
}

// Account-level pay/currency preferences — independent of which list is
// active (see useItems.js, which now only handles list-scoped items and
// takes these settings in as a prop rather than owning them).
export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  // One shared error string for both the initial load and updateSettings,
  // surfaced via App.jsx's global Toast — same convention as useItems.js's
  // `error` (see the comment there): updateSettings is optimistic and
  // fire-and-forget (SettingsModal closes without awaiting the save), so
  // there's no inline location left to show a failure by the time one
  // could happen.
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) { setSettings(DEFAULT_SETTINGS); setLoading(false); return; }

    setLoading(true);
    let cancelled = false;
    let channel = null;

    loadResource(async () => {
      const { data, error: loadError } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle();
      if (cancelled) return;

      if (loadError) {
        console.error('settings load error', loadError);
        setError('Could not load your settings. Check your connection.');
      } else if (data) {
        setSettings(settingsFromRow(data));
      } else {
        // Brand-new account, no settings row yet — seed the defaults and
        // persist them so they aren't lost/regenerated on the next load.
        setSettings(DEFAULT_SETTINGS);
        supabase.from('settings').insert(settingsToRow(DEFAULT_SETTINGS, user.id)).then(({ error: seedError }) => {
          if (seedError) console.error('seed settings error', seedError);
        });
      }

      setLoading(false);
      if (cancelled) return;

      channel = supabase
        .channel(`settings-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${user.id}` },
          (payload) => { if (payload.eventType !== 'DELETE') setSettings(settingsFromRow(payload.new)); })
        .subscribe();
    }, {
      setLoading, setError,
      errorMessage: 'Could not load your settings. Check your connection.',
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  const saveSettings = useCallback(async (next) => {
    if (!user) return;
    try {
      setError(null);
      const { error: saveError } = await supabase.from('settings').upsert(settingsToRow(next, user.id));
      if (saveError) throw saveError;
    } catch (e) {
      console.error('saveSettings error', e);
      setError('Could not save settings. Check your connection.');
    }
  }, [user]);

  // Merges into the current settings, then saves — the common case (the
  // Settings modal saving a partial change).
  const updateSettings = (updates) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    saveSettings(next);
  };

  // Replaces the settings wholesale, then saves — for imports, which
  // restore a full settings object rather than patching the current one.
  const replaceSettings = useCallback((next) => {
    setSettings(next);
    saveSettings(next);
  }, [saveSettings]);

  return {
    settings, updateSettings, replaceSettings,
    loading, error, clearError: () => setError(null),
  };
}
