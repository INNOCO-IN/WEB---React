import { useTranslation } from 'react-i18next';
import SupabaseForm from './SupabaseForm';
import './WorkshopRegister.css';

/**
 * The sign-up form in a workshop page's `#register` band.
 *
 * Every workshop page has carried a "Register now" button since the static
 * site, and until now it scrolled to a band that offered two links — the
 * general enquiry form, and the workshop index. The table it should have been
 * writing to has existed just as long: `workshop_registrations` is in the
 * schema, the review desk at `/review` already lists it as a queue, and RLS
 * already grants `anon` the insert. The only missing piece was a form.
 *
 * It renders inside the band rather than on a route of its own. A registration
 * that costs a navigation is a registration someone abandons, and the band is
 * already where the button points — so the button now reaches something that
 * takes an answer rather than something that offers another link.
 *
 * The fields are the table's columns, which is the convention every form here
 * follows: a field's `name` is where it lands. `workshop_slug` is the one the
 * visitor does not fill in — it is the page they are on, and it is why a row
 * can say which workshop it is for. `source_page` is added by SupabaseForm.
 */

export interface WorkshopRegisterProps {
  /** The workshop being registered for — `workshops.slug`, which the row keys. */
  slug: string;
  /**
   * The band's background colour.
   *
   * The submit button inverts against it — paper ground, accent letters, the
   * same shape as the primary link beside it — so the colour has to come from
   * the page. Every band is a different one.
   */
  accent: string;
}

export default function WorkshopRegister({ slug, accent }: WorkshopRegisterProps) {
  const { t } = useTranslation();

  return (
    <SupabaseForm
      table="workshop_registrations"
      tone="paper"
      thanks={t('register.thanks')}
      className="wsreg"
      // The thank-you replaces the form and inherits this class, but not its
      // margin: SupabaseForm sets `margin: 0` inline on that paragraph, so the
      // gap above the links has to be stated where inline styles can see it.
      style={{ marginBottom: '32px' }}
    >
      {/* Not a column: the page it was sent from is the page the visitor was
          reading, and the slug is what pairs the row with a workshop. */}
      <input type="hidden" name="workshop_slug" value={slug} />

      {/* A real visitor never sees this, so anything in it is a bot. Hidden by
          position rather than by `display: none`, which some bots skip. */}
      <div aria-hidden="true" className="wsreg__hp">
        <label>
          {t('register.honeypot')}
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="wsreg__row">
        <div className="wsreg__cell">
          <label className="wsreg__label" htmlFor="wsreg-name">
            {t('register.name')}
          </label>
          <input
            className="wsreg__field"
            type="text"
            name="name"
            id="wsreg-name"
            autoComplete="name"
            placeholder={t('register.namePlaceholder')}
            required
          />
        </div>
        <div className="wsreg__cell">
          <label className="wsreg__label" htmlFor="wsreg-email">
            {t('register.email')}
          </label>
          <input
            className="wsreg__field"
            type="email"
            name="email"
            id="wsreg-email"
            autoComplete="email"
            placeholder={t('register.emailPlaceholder')}
            required
          />
        </div>
      </div>

      <div>
        <label className="wsreg__label" htmlFor="wsreg-org">
          {t('register.org')}
          <span className="wsreg__hint">{t('form.optional')}</span>
        </label>
        <input
          className="wsreg__field"
          type="text"
          name="org"
          id="wsreg-org"
          autoComplete="organization"
          placeholder={t('register.orgPlaceholder')}
        />
      </div>

      <div>
        <label className="wsreg__label" htmlFor="wsreg-message">
          {t('register.message')}
          <span className="wsreg__hint">{t('form.optional')}</span>
        </label>
        <textarea
          className="wsreg__field"
          name="message"
          id="wsreg-message"
          rows={4}
          placeholder={t('register.messagePlaceholder')}
        />
      </div>

      <button type="submit" className="wsreg__submit" style={{ color: accent }}>
        {t('register.submit')}
      </button>
    </SupabaseForm>
  );
}
