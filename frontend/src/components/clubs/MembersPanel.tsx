import { useCallback, useState } from 'react';
import { useLoad } from '../../hooks/useLoad';
import { listMembers, updateMember } from '../../services/clubs';
import { cardClass } from '../../lib/styles';
import StatusBadge from '../ui/StatusBadge';
import type { Member, MembershipRole, MembershipStatus } from '../../types';

interface Props {
  clubId: string;
  isAdmin: boolean;
}

const smallPrimary =
  'px-3 py-1.5 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60';
const smallSecondary =
  'px-3 py-1.5 bg-white text-neutral-900 border border-neutral-300 rounded-md text-xs font-medium hover:bg-neutral-100 transition-colors disabled:opacity-60';

export default function MembersPanel({ clubId, isAdmin }: Props) {
  const loadPending = useCallback(() => listMembers(clubId, 'pending'), [clubId]);
  const loadApproved = useCallback(() => listMembers(clubId, 'approved'), [clubId]);
  const pending = useLoad(loadPending);
  const approved = useLoad(loadApproved);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function act(member: Member, body: { status?: MembershipStatus; role?: MembershipRole }) {
    setError('');
    setBusy(member.userId);
    try {
      await updateMember(clubId, member.userId, body);
      pending.reload();
      approved.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy('');
    }
  }

  const nameOf = (m: Member) => m.email ?? m.userId;

  return (
    <div className={`${cardClass} mt-6`}>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Join requests</h2>
      {pending.loading ? (
        <p className="text-neutral-600">Loading…</p>
      ) : pending.error ? (
        <p className="text-sm text-red-600">{pending.error}</p>
      ) : !pending.data?.length ? (
        <p className="text-neutral-600">No pending requests.</p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {pending.data.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-3">
              <span className="text-sm text-neutral-900">{nameOf(m)}</span>
              <div className="flex gap-2">
                <button type="button" disabled={busy === m.userId} onClick={() => act(m, { status: 'approved' })} className={smallPrimary}>
                  Approve
                </button>
                <button type="button" disabled={busy === m.userId} onClick={() => act(m, { status: 'rejected' })} className={smallSecondary}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-lg font-semibold text-neutral-900 mt-8 mb-4">Members</h2>
      {approved.loading ? (
        <p className="text-neutral-600">Loading…</p>
      ) : approved.error ? (
        <p className="text-sm text-red-600">{approved.error}</p>
      ) : !approved.data?.length ? (
        <p className="text-neutral-600">No approved members yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {approved.data.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-3">
              <span className="text-sm text-neutral-900">{nameOf(m)}</span>
              <div className="flex items-center gap-3">
                {m.role === 'executive' && (
                  <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Executive</span>
                )}
                <StatusBadge status={m.status} />
                {isAdmin && m.role === 'member' && (
                  <button
                    type="button"
                    disabled={busy === m.userId}
                    onClick={() => act(m, { status: 'approved', role: 'executive' })}
                    className={smallSecondary}
                  >
                    Make executive
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
    </div>
  );
}
