import { base44 } from '@/api/base44Client';

// Função para obter usuários acessíveis baseado na hierarquia
export async function getAccessibleUsers(currentUser, currentUserProfile) {
  // Super admin vê todos
  if (currentUser.role === 'admin') {
    const allUsers = await base44.entities.User.list();
    return allUsers.map(u => u.email);
  }

  // Buscar todos os perfis do mesmo cliente
  const allProfiles = await base44.entities.UserProfile.filter({ 
    client_id: currentUserProfile.client_id 
  });

  const hierarchy = {
    master: 4,
    manager: 3,
    supervisor: 2,
    producer: 1,
  };

  const currentLevel = hierarchy[currentUserProfile.role];
  const accessibleEmails = [currentUser.email];

  // Função recursiva para encontrar subordinados
  const findDownline = (parentEmail) => {
    const subordinates = allProfiles.filter(p => p.parent_user_id === parentEmail);
    subordinates.forEach(sub => {
      const subLevel = hierarchy[sub.role];
      if (subLevel < currentLevel) {
        accessibleEmails.push(sub.created_by);
        findDownline(sub.created_by);
      }
    });
  };

  findDownline(currentUser.email);
  return accessibleEmails;
}

// Verifica se usuário pode gerenciar outro usuário
export function canManageUsers(userProfile) {
  return ['master', 'manager'].includes(userProfile?.role);
}

// Verifica se é super admin
export function isSuperAdmin(user) {
  return user?.role === 'admin';
}