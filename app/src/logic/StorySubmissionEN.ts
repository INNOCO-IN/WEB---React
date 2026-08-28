import { useState } from 'react';
import type { FormEvent } from 'react';

/**
 * Story Submission — the progressive reveal.
 *
 * The rest of the form's behaviour (chip groups, upload, insert) belongs to
 * SupabaseForm and ChipGroup now. All that is left here is the one piece of
 * page state: the later steps stay hidden until there is something in the
 * story box, so the form opens as one question rather than eight.
 */
export default function useLogic() {
  const [typed, setTyped] = useState(false);

  return {
    typed,
    onType: (event: FormEvent<HTMLTextAreaElement>) => {
      setTyped(event.currentTarget.value.trim().length > 0);
    },
  };
}
