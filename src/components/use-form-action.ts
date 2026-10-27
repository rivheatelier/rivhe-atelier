"use client";

import { startTransition, useActionState } from "react";

/**
 * useActionState for forms, minus React's automatic form reset: when the action
 * returns an error, whatever the person typed stays in the fields.
 * Spread the returned `form` props onto the <form>.
 */
export function useFormAction<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
) {
  const [state, dispatch, pending] = useActionState<State, FormData>(action, initialState);
  const form = {
    // Before JavaScript loads, the browser posts straight to the Server Action.
    action: dispatch,
    // Once hydrated, submit manually so React doesn't clear the fields afterwards.
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(() => dispatch(formData));
    },
  };
  return [state, form, pending] as const;
}
