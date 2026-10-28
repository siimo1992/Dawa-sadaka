import React from 'react';
import { AppProvider, type CharityNotificationPayload } from './context/AppContext';
import { DashboardLayout } from './components/DashboardLayout';
import { HelpRequestsPage } from './pages/HelpRequestsPage';

export interface MyCharitySectionProps {
  isAdminLoggedIn?: boolean;
  onBackToChat?: () => void;
  onToggleSidebar?: () => void;
  onOpenAdminPanel?: () => void;
  onNotify?: (payload: CharityNotificationPayload) => void;
}

export default function MyCharitySection({
  isAdminLoggedIn = false,
  onBackToChat,
  onToggleSidebar,
  onOpenAdminPanel,
  onNotify,
}: MyCharitySectionProps = {}) {
  return (
    <AppProvider
      isAdminLoggedIn={isAdminLoggedIn}
      onBackToChat={onBackToChat}
      onToggleSidebar={onToggleSidebar}
      onOpenAdminPanel={onOpenAdminPanel}
      onNotify={onNotify}
    >
      <DashboardLayout>
        <HelpRequestsPage />
      </DashboardLayout>
    </AppProvider>
  );
}
