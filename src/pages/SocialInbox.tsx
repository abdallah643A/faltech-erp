import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquare, Send, FileText, Settings, BarChart3, Users } from 'lucide-react';
import { ConversationList } from '@/components/social/ConversationList';
import { ConversationPanel } from '@/components/social/ConversationPanel';
import { CustomerContextPanel } from '@/components/social/CustomerContextPanel';
import { TemplateManager } from '@/components/social/TemplateManager';
import { CampaignManager } from '@/components/social/CampaignManager';
import { ChannelSettings } from '@/components/social/ChannelSettings';

export default function SocialInbox() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(true);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b px-4 pt-2">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">Messaging Hub</h1>
          </div>
          <TabsList className="h-9">
            <TabsTrigger value="inbox" className="text-xs gap-1"><MessageSquare className="h-3.5 w-3.5" />Inbox</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" />Templates</TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs gap-1"><Send className="h-3.5 w-3.5" />Campaigns</TabsTrigger>
            <TabsTrigger value="channels" className="text-xs gap-1"><Settings className="h-3.5 w-3.5" />Channels</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inbox" className="flex-1 m-0 overflow-hidden">
          <div className="flex h-full">
            {/* Conversation List */}
            <div className="w-80 border-r flex-shrink-0 overflow-hidden">
              <ConversationList
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
              />
            </div>

            {/* Conversation Panel */}
            <div className="flex-1 overflow-hidden">
              <ConversationPanel
                conversationId={selectedConversationId}
                onToggleContext={() => setShowContext(!showContext)}
              />
            </div>

            {/* Context Panel */}
            {showContext && selectedConversationId && (
              <div className="w-80 border-l flex-shrink-0 overflow-hidden">
                <CustomerContextPanel conversationId={selectedConversationId} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 m-0 overflow-auto p-4">
          <TemplateManager />
        </TabsContent>

        <TabsContent value="campaigns" className="flex-1 m-0 overflow-auto p-4">
          <CampaignManager />
        </TabsContent>

        <TabsContent value="channels" className="flex-1 m-0 overflow-auto p-4">
          <ChannelSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
