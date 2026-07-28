import { useState } from 'react';
import { FormError, SubmitButton, TextField } from '../ui/Field';
import { inviteUser } from '../../lib/repository';

interface Props {
  adminUid: string;
  onDone: () => void;
}

export function InviteForm({ adminUid, onDone }: Props) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      await inviteUser(adminUid, email);
      onDone();
    } catch {
      setError('Could not send that invitation. Only admins can invite users.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError>{error}</FormError>

      <TextField
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="name@example.com"
        required
        autoFocus
        hint="They can sign in with Google once this address is on the list."
      />

      <SubmitButton loading={saving} loadingLabel="Inviting…">
        Send invitation
      </SubmitButton>
    </form>
  );
}
