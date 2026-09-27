import { getSupabase } from "./supabase";
import { Artwork, ChatMessage, ConversationSummary, PaymentMethod, PublicUser } from "./types";

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
};

function mapProfile(row: ProfileRow): PublicUser {
  return { id: row.id, username: row.username, displayName: row.display_name, avatarUrl: row.avatar_url, bio: row.bio };
}

type ArtworkRow = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: "image" | "file";
  mime_type: string;
  tags: string;
  price: number | null;
  created_at: string;
  author: ProfileRow;
  likes: { user_id: string }[];
};

function mapArtwork(row: ArtworkRow, viewerId?: string | null): Artwork {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    fileUrl: row.file_url,
    fileType: row.file_type,
    mimeType: row.mime_type,
    tags: row.tags ? row.tags.split(",").filter(Boolean) : [],
    price: row.price,
    createdAt: row.created_at,
    author: mapProfile(row.author),
    likeCount: row.likes?.length ?? 0,
    likedByMe: viewerId ? (row.likes ?? []).some((l) => l.user_id === viewerId) : false,
  };
}

const ARTWORK_SELECT =
  "id,title,description,file_url,file_type,mime_type,tags,price,created_at,author:profiles(id,username,display_name,avatar_url,bio),likes(user_id)";

export async function listArtworks(opts: { tag?: string; authorId?: string; viewerId?: string | null }) {
  const supabase = getSupabase();
  let query = supabase.from("artworks").select(ARTWORK_SELECT).order("created_at", { ascending: false });
  if (opts.tag) query = query.ilike("tags", `%${opts.tag}%`);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as ArtworkRow[]).map((r) => mapArtwork(r, opts.viewerId));
}

export async function getArtwork(id: string, viewerId?: string | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("artworks").select(ARTWORK_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapArtwork(data as unknown as ArtworkRow, viewerId);
}

export async function createArtwork(input: {
  title: string;
  description: string;
  fileUrl: string;
  fileType: "image" | "file";
  mimeType: string;
  tags: string[];
  price: number | null;
  authorId: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("artworks")
    .insert({
      title: input.title,
      description: input.description,
      file_url: input.fileUrl,
      file_type: input.fileType,
      mime_type: input.mimeType,
      tags: input.tags.join(","),
      price: input.price,
      author_id: input.authorId,
    })
    .select(ARTWORK_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapArtwork(data as unknown as ArtworkRow, input.authorId);
}

export async function deleteArtwork(id: string) {
  const supabase = getSupabase();
  unwrap(await supabase.from("artworks").delete().eq("id", id));
}

export async function toggleLike(artworkId: string, userId: string) {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("artwork_id", artworkId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    unwrap(await supabase.from("likes").delete().eq("id", existing.id));
  } else {
    unwrap(await supabase.from("likes").insert({ artwork_id: artworkId, user_id: userId }));
  }

  const { count } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("artwork_id", artworkId);

  return { liked: !existing, likeCount: count ?? 0 };
}

export async function getProfileByUsername(username: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("profiles").select("id,username,display_name,bio,avatar_url").eq("username", username).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function updateMyProfile(userId: string, input: { displayName?: string; bio?: string; avatarUrl?: string | null }) {
  const supabase = getSupabase();
  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select().single();
  if (error) throw new Error(error.message);
  return mapProfile(data as ProfileRow);
}

type PaymentMethodRow = {
  id: string;
  type: PaymentMethod["type"];
  label: string;
  value: string;
  qr_image_url: string | null;
};

function mapPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return { id: row.id, type: row.type, label: row.label, value: row.value, qrImageUrl: row.qr_image_url };
}

export async function listPaymentMethods(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id,type,label,value,qr_image_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as PaymentMethodRow[]).map(mapPaymentMethod);
}

export async function addPaymentMethod(userId: string, input: { type: PaymentMethod["type"]; label: string; value: string; qrImageUrl: string | null }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("payment_methods")
    .insert({ user_id: userId, type: input.type, label: input.label, value: input.value, qr_image_url: input.qrImageUrl })
    .select("id,type,label,value,qr_image_url")
    .single();
  if (error) throw new Error(error.message);
  return mapPaymentMethod(data as PaymentMethodRow);
}

export async function removePaymentMethod(id: string) {
  const supabase = getSupabase();
  unwrap(await supabase.from("payment_methods").delete().eq("id", id));
}

export async function getOrCreateConversation(targetUserId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_or_create_conversation", { target_user_id: targetUserId });
  if (error) throw new Error(error.message);
  return data as string;
}

type ConversationRow = {
  conversation_id: string;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string | null;
  last_message_content: string | null;
  last_message_created_at: string | null;
  last_message_sender_id: string | null;
  my_last_read_at: string | null;
};

export async function listConversations(myUserId: string): Promise<ConversationSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("list_my_conversations");
  if (error) throw new Error(error.message);
  return (data as ConversationRow[])
    .map((r) => ({
      id: r.conversation_id,
      otherUser: {
        id: r.other_user_id,
        username: r.other_username,
        displayName: r.other_display_name,
        avatarUrl: r.other_avatar_url,
      },
      lastMessage: r.last_message_content
        ? { content: r.last_message_content, createdAt: r.last_message_created_at!, senderId: r.last_message_sender_id! }
        : null,
      unread:
        !!r.last_message_content &&
        r.last_message_sender_id !== myUserId &&
        (!r.my_last_read_at || new Date(r.last_message_created_at!) > new Date(r.my_last_read_at)),
      updatedAt: r.last_message_created_at ?? new Date(0).toISOString(),
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

type MessageRow = {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender: ProfileRow;
};

function mapMessage(row: MessageRow): ChatMessage {
  return { id: row.id, conversationId: row.conversation_id, content: row.content, createdAt: row.created_at, sender: mapProfile(row.sender) };
}

export async function listMessages(conversationId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,content,created_at,sender:profiles(id,username,display_name,avatar_url,bio)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as MessageRow[]).map(mapMessage);
}

export async function markConversationRead(conversationId: string, userId: string) {
  const supabase = getSupabase();
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select("id,conversation_id,content,created_at,sender:profiles(id,username,display_name,avatar_url,bio)")
    .single();
  if (error) throw new Error(error.message);
  return mapMessage(data as unknown as MessageRow);
}

/** Subscribes to new messages in a conversation via Supabase Realtime
 * (Postgres change streaming, gated by the same RLS policies as a normal
 * SELECT). Returns an unsubscribe function. */
export function subscribeToMessages(conversationId: string, onMessage: (raw: Record<string, unknown>) => void) {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** A realtime INSERT payload only has raw DB columns (no joined sender
 * profile), so fetch the sender's public profile separately to render it. */
export async function getProfileById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("profiles").select("id,username,display_name,bio,avatar_url").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function uploadPublicFile(userId: string, folder: "avatars" | "artworks" | "qr", file: File) {
  const supabase = getSupabase();
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  const fileType: "image" | "file" = file.type.startsWith("image/") ? "image" : "file";
  return { url: data.publicUrl, mimeType: file.type || "application/octet-stream", fileType };
}
