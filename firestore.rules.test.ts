/**
 * Phase 0 & Phase 5 Security Rules Verification Suite (Dirty Dozen Payloads)
 * Verifies that all 12 adversarial payloads from security_spec.md are rejected
 * with PERMISSION_DENIED by the hardened Firestore security rules.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on User Profile',
    collectionPath: '/users/user_B',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      uid: 'user_B',
      displayName: 'Spoofed User',
      photoURL: '',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    collectionPath: '/users/user_A',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: false },
    payload: {
      uid: 'user_A',
      displayName: 'Unverified User',
      photoURL: '',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow/Ghost Field Injection',
    collectionPath: '/users/user_A',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      uid: 'user_A',
      displayName: 'Valid Name',
      photoURL: '',
      isAdmin: true,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Client Timestamp Forgery',
    collectionPath: '/users/user_A',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      uid: 'user_A',
      displayName: 'Valid Name',
      photoURL: '',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Immortal Field Mutation (ownerId)',
    collectionPath: '/users/user_A/chatSessions/sess_1',
    operation: 'update',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      ownerId: 'user_B',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Subcollection Write (No Parent User Doc)',
    collectionPath: '/users/non_existent_user/chatSessions/sess_1',
    operation: 'create',
    auth: { uid: 'non_existent_user', email_verified: true },
    payload: {
      sessionId: 'sess_1',
      ownerId: 'non_existent_user',
      title: 'Orphaned Chat',
      preview: 'Hello',
      lastUserPrompt: 'Hi',
      lastAiResponse: 'Welcome',
      agentId: 'guide',
      messagesCount: 2,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Path ID Poisoning',
    collectionPath: '/users/user_A/chatSessions/invalid$id!@#',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      sessionId: 'invalid$id!@#',
      ownerId: 'user_A',
      title: 'Test',
      preview: '',
      lastUserPrompt: '',
      lastAiResponse: '',
      agentId: 'guide',
      messagesCount: 1,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Denial of Wallet / Oversized Title String',
    collectionPath: '/users/user_A/chatSessions/sess_1',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      sessionId: 'sess_1',
      ownerId: 'user_A',
      title: 'X'.repeat(500),
      preview: '',
      lastUserPrompt: '',
      lastAiResponse: '',
      agentId: 'guide',
      messagesCount: 1,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Update-Gap / Value Poisoning on Whitelisted Key',
    collectionPath: '/users/user_A/chatSessions/sess_1',
    operation: 'update',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      title: '',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unauthorized Partial Update Key',
    collectionPath: '/users/user_A/chatSessions/sess_1',
    operation: 'update',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      agentId: 'desert',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-Tenant Read/List Leak',
    collectionPath: '/users/user_A/chatSessions',
    operation: 'list',
    auth: { uid: 'user_B', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Invalid Enum Injection in SavedNewsItem',
    collectionPath: '/users/user_A/savedNews/news_1',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: {
      newsId: 'news_1',
      ownerId: 'user_A',
      source: 'Local Source',
      text: 'News text',
      category: 'invalid_enum_value',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
