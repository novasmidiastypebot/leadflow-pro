import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getAccessibleUsers } from './AccessControl';

export default function LeadAssignment({ currentUser, currentUserProfile, selectedLead, onAssign }) {
  const [accessibleEmails, setAccessibleEmails] = useState([]);

  useEffect(() => {
    if (currentUser && currentUserProfile) {
      loadAccessibleUsers();
    }
  }, [currentUser, currentUserProfile]);

  const loadAccessibleUsers = async () => {
    const emails = await getAccessibleUsers(currentUser, currentUserProfile);
    setAccessibleEmails(emails);
  };

  const { data: allMembers = [] } = useQuery({
    queryKey: ['team-members', currentUserProfile?.client_id],
    queryFn: async () => {
      if (!currentUserProfile) return [];
      return await base44.entities.TeamMember.filter({ client_id: currentUserProfile.client_id });
    },
    enabled: !!currentUserProfile,
  });

  const assignableUsers = allMembers.filter(m => accessibleEmails.includes(m.email));

  return (
    <div>
      <Label>Responsável</Label>
      <Select
        value={selectedLead?.assigned_to || ''}
        onValueChange={(value) => onAssign(value)}
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Atribuir para..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Não atribuído</SelectItem>
          {assignableUsers.map((member) => (
            <SelectItem key={member.email} value={member.email}>
              {member.name} ({member.role})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}