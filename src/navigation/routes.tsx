import type { ComponentType, JSX } from 'react';

import { IndexPage } from '@/pages/IndexPage/IndexPage';
import { FriendsPage } from '@/pages/FriendsPage/FriendsPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage/LeaderboardPage'; // Предполагается, что эта страница существует

interface Route {
  path: string;
  Component: ComponentType;
  title?: string;
  icon?: JSX.Element;
}

export const routes: Route[] = [
  { path: '/', Component: IndexPage, title: 'Home' },
  { path: '/friends', Component: FriendsPage, title: 'Friends' },
  { path: '/leaderboard', Component: LeaderboardPage, title: 'Leaderboard' },
];