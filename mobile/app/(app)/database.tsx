import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Box, Button, Message } from '../../src/components/ui';
import { api, ApiError, DatabaseResponse } from '../../src/lib/api';
import { describeError } from '../../src/lib/errors';
import { styles } from '../../src/styles';

// What each table is for, shown above it.
const about: Record<string, string> = {
  users: 'Accounts. password_hash is the only form the password is stored in (salt inside, pepper never stored).',
  otp_challenges: 'Login codes. Only an HMAC of the 6-digit code (otp_hash) is stored.',
  sessions: 'Login sessions. Only the SHA-256 hash of each session token is stored.',
  rate_limits: 'Counters that stop password guessing. The key is stored hashed.',
  auth_events: 'Security event log used by the Reports page. Passwords and codes are never logged.',
  restore_points: "Saved configurations: each account's role and deleted status.",
};

// Long values (hashes, JSON) get wider columns.
const widthOf = (column: string) =>
  /hash|config|bucket|user_agent/.test(column) ? 380 : /detail|email|label|name/.test(column) ? 200 : /_at$|time/.test(column) ? 170 : 110;

export default function Database() {
  const [data, setData] = useState<DatabaseResponse | null>(null);
  const [selected, setSelected] = useState('users');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.database());
    } catch (e) {
      setData(null);
      setError(
        e instanceof ApiError && e.status === 403
          ? 'Access denied (403). You do not have permission to view this page.'
          : describeError(e),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const table = data?.tables.find((t) => t.name === selected) ?? null;

  return (
    <View>
      <Text style={styles.heading}>Database</Text>

      {loading && !data ? <Text style={styles.text}>Loading the database...</Text> : null}
      {error ? <Message kind="error">{error}</Message> : null}

      {data ? (
        <>
          <Text style={styles.text}>
            The live tables, exactly as stored. Passwords, session tokens and codes appear only as hashes.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {data.tables.map((t) => (
              <Pressable
                key={t.name}
                accessibilityRole="button"
                onPress={() => setSelected(t.name)}
                style={[styles.tab, t.name === selected && styles.tabActive]}
              >
                <Text style={[styles.tabText, t.name === selected && { color: '#ffffff' }]}>
                  {t.name} ({t.row_count})
                </Text>
              </Pressable>
            ))}
          </View>

          {table ? (
            <Box>
              <Text style={styles.formHeading}>{table.name}</Text>
              <Text style={styles.formIntro}>
                {about[table.name] ?? ''} {table.row_count} row(s)
                {table.row_count > table.rows.length ? `, newest ${table.rows.length} shown` : ''}.
              </Text>
              <ScrollView horizontal>
                <View>
                  <View style={[styles.tableRow, styles.tableHead]}>
                    {table.columns.map((c) => (
                      <Text key={c} style={[styles.cell, styles.bold, { width: widthOf(c) }]}>
                        {c}
                      </Text>
                    ))}
                  </View>
                  {table.rows.length === 0 ? (
                    <Text style={[styles.cell, { color: '#555555' }]}>(empty table)</Text>
                  ) : (
                    table.rows.map((row, i) => (
                      <View key={i} style={styles.tableRow}>
                        {row.map((value, j) => (
                          <Text
                            key={j}
                            selectable
                            style={[
                              /hash|config|bucket/.test(table.columns[j]) ? styles.mono : styles.cell,
                              { width: widthOf(table.columns[j]), padding: 8 },
                              value === null && { color: '#999999' },
                            ]}
                          >
                            {value ?? 'NULL'}
                          </Text>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </Box>
          ) : null}
        </>
      ) : null}

      <View style={{ maxWidth: 200 }}>
        <Button title="Refresh" onPress={load} loading={loading} secondary />
      </View>
    </View>
  );
}
