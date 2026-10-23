/* Provideri listă + FAB pe rutele publice (nu /admin). */
'use client';
import { ActiveStepperProvider } from './ActiveStepperContext';
import { FlyToListProvider } from './FlyToList';
import ListFab from './ListFab';
import ListUndoHost from './ListUndoHost';
import { ShoppingListProvider } from './ShoppingListProvider';

export default function PublicListChrome({ children }: { children: React.ReactNode }) {
  return (
    <ShoppingListProvider>
      <FlyToListProvider>
        <ActiveStepperProvider>
          {children}
          <ListFab />
          <ListUndoHost />
        </ActiveStepperProvider>
      </FlyToListProvider>
    </ShoppingListProvider>
  );
}
