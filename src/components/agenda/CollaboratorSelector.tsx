import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import type { CorporateTeamMember } from '@/types/database';

// =====================================================
// Collaborator selector for the /pj/agenda header (MGR-01).
//
// It reads the `corporate_team` rows `useInitializeData` already put in the
// store — no new query. `null` is a first-class value meaning "my own
// calendar" (MGR-02); Radix Select only accepts strings, so the null case is
// carried by a sentinel that never leaves this file.
// =====================================================

/** Sentinel for the manager's own calendar. Internal: callers only ever see `null`. */
const OWN_CALENDAR = '__minha_agenda__';

export type CollaboratorOption = {
  /** `corporate_team.member_user_id` — what the selector reports. */
  id: string;
  name: string;
  role: string;
};

/**
 * MGR-01 lists exactly `is_active = true` AND `member_user_id IS NOT NULL`.
 * COLAB-11 excludes a collaborator without an account from the feature.
 */
export function collaboratorOptionsFromTeam(team: CorporateTeamMember[]): CollaboratorOption[] {
  return team
    .filter(member => member.is_active === true && member.member_user_id != null)
    .map(member => ({
      id: member.member_user_id as string,
      name: member.name,
      role: member.role,
    }));
}

interface CollaboratorSelectorProps {
  /** `null` = the manager's own calendar, the default. */
  value: string | null;
  onChange: (id: string | null) => void;
}

export function CollaboratorSelector({ value, onChange }: CollaboratorSelectorProps) {
  const team = useAppStore(state => state.corporateTeam);
  const options = collaboratorOptionsFromTeam(team);

  return (
    <Select
      value={value ?? OWN_CALENDAR}
      onValueChange={next => onChange(next === OWN_CALENDAR ? null : next)}
    >
      <SelectTrigger className="h-9 w-[210px]" aria-label="Colaborador">
        <SelectValue placeholder="Selecionar colaborador" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={OWN_CALENDAR}>Minha agenda</SelectItem>
        {options.map(option => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
