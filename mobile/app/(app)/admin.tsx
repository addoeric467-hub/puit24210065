import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Box, Button, formatDate, Message } from '../../src/components/ui';
import { AdminUsersResponse, api, ApiError, User } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { confirmAction } from '../../src/lib/device';
import { describeError } from '../../src/lib/errors';
import { BLUE, styles } from '../../src/styles';

// Column widths so the table lines up (the table scrolls sideways on a phone).
const widths = { id: 45, name: 130, email: 200, role: 75, status: 80, last: 150, action: 80 };
const tableWidth = Object.values(widths).reduce((a, b) => a + b, 0);

export default function Users() {
  const { user: me } = useAuth();
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.adminUsers());
    } catch (e) {
      setData(null);
      // The request is always sent. The server decides: a student gets 403.
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

  const toggle = async (u: User) => {
    const deleting = u.status !== 'deleted';
    const ok = await confirmAction(
      deleting ? 'Delete account' : 'Restore account',
      deleting
        ? `Delete ${u.email}? The account is kept in the database but marked as deleted, and it can no longer log in.`
        : `Restore ${u.email}? The account becomes active again with the same password.`,
    );
    if (!ok) return;
    setBusyId(u.id);
    setError(null);
    setInfo(null);
    try {
      const res = deleting ? await api.deleteUser(u.id) : await api.restoreUser(u.id);
      setInfo(res.message);
      await load();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View>
      <Text style={styles.heading}>Users</Text>

      {loading && !data ? <Text style={styles.text}>Loading users...</Text> : null}
      {error ? <Message kind="error">{error}</Message> : null}
      {info ? <Message kind="success">{info}</Message> : null}

      {data ? (
        <Box>
          <Text style={styles.text}>
            Total accounts: {data.total} ({data.summary.admins} admin, {data.summary.students} student,{' '}
            {data.summary.deleted} deleted). Active sessions: {data.summary.active_sessions}.
          </Text>

          <ScrollView horizontal>
            <View>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.cell, styles.bold, { width: widths.id }]}>ID</Text>
                <Text style={[styles.cell, styles.bold, { width: widths.name }]}>Name</Text>
                <Text style={[styles.cell, styles.bold, { width: widths.email }]}>Email</Text>
                <Text style={[styles.cell, styles.bold, { width: widths.role }]}>Role</Text>
                <Text style={[styles.cell, styles.bold, { width: widths.status }]}>Status</Text>
                <Text style={[styles.cell, styles.bold, { width: widths.action }]}>Action</Text>
                <Text style={[styles.cell, styles.bold, { width: widths.last }]}>Last login</Text>
              </View>
              {data.users.map((u) => {
                const deleted = u.status === 'deleted';
                return (
                  <View key={u.id} style={[{ borderBottomWidth: 1, borderBottomColor: '#cccccc' }, deleted && { backgroundColor: '#f6f6f6' }]}>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={[styles.cell, { width: widths.id }]}>{u.id}</Text>
                      <Text style={[styles.cell, { width: widths.name }, deleted && styles.deletedText]}>{u.name}</Text>
                      <Text style={[styles.cell, { width: widths.email }, deleted && styles.deletedText]}>{u.email}</Text>
                      <Text style={[styles.cell, { width: widths.role }]}>{u.role}</Text>
                      <Text style={[styles.cell, { width: widths.status }, deleted && { color: '#b00020', fontWeight: 'bold' }]}>
                        {deleted ? 'deleted' : 'active'}
                      </Text>
                      <View style={[styles.cell, { width: widths.action }]}>
                        {u.id === me?.id ? (
                          <Text style={styles.small}>(you)</Text>
                        ) : (
                          <Pressable accessibilityRole="button" disabled={busyId !== null} onPress={() => void toggle(u)}>
                            <Text style={{ color: deleted ? BLUE : '#b00020', textDecorationLine: 'underline' }}>
                              {busyId === u.id ? '...' : deleted ? 'Restore' : 'Delete'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <Text style={[styles.cell, { width: widths.last }]}>{formatDate(u.last_login_at)}</Text>
                    </View>
                    <Text selectable style={[styles.mono, { width: tableWidth, paddingHorizontal: 8, paddingBottom: 8 }]}>
                      <Text style={[styles.bold, { fontFamily: undefined }]}>Password as stored (full hash): </Text>
                      {u.password_storage ?? '-'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <Text style={styles.small}>
            The real password is never stored. The "Password as stored" line under each account shows the full stored value: the
            algorithm (argon2id), its settings, the random salt and the hash. The pepper is kept only on the server, so the
            hash cannot be checked without it. Deleted accounts stay in the database, marked as deleted, and cannot log in.
          </Text>
        </Box>
      ) : null}

      <View style={{ maxWidth: 200 }}>
        <Button title="Refresh" onPress={load} loading={loading} secondary />
      </View>
    </View>
  );
}
