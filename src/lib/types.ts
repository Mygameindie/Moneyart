export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string;
};

export type Artwork = {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: "image" | "file";
  mimeType: string;
  tags: string[];
  price: number | null;
  createdAt: string;
  author: PublicUser;
  likeCount: number;
  likedByMe: boolean;
};

export type PaymentMethod = {
  id: string;
  type: "PAYPAL" | "QR" | "BANK";
  label: string;
  value: string;
  qrImageUrl: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  sender: PublicUser;
};

export type ConversationSummary = {
  id: string;
  otherUser: PublicUser | null;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  unread: boolean;
  updatedAt: string;
};
