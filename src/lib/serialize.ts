import { Artwork, Like, User } from "@prisma/client";

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string;
};

export function serializeUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
  };
}

type ArtworkWithRelations = Artwork & {
  author: User;
  likes: Like[];
};

export function serializeArtwork(artwork: ArtworkWithRelations, viewerId?: string | null) {
  return {
    id: artwork.id,
    title: artwork.title,
    description: artwork.description,
    fileUrl: artwork.fileUrl,
    fileType: artwork.fileType,
    mimeType: artwork.mimeType,
    tags: artwork.tags ? artwork.tags.split(",").filter(Boolean) : [],
    price: artwork.price,
    createdAt: artwork.createdAt,
    author: serializeUser(artwork.author),
    likeCount: artwork.likes.length,
    likedByMe: viewerId ? artwork.likes.some((l) => l.userId === viewerId) : false,
  };
}
