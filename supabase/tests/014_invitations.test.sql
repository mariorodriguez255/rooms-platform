begin;
\ir _helpers.psql

select plan(31);
select tests.two_orgs();
select tests.create_user('elena@example.org', 'Elena Invited');

-- Tokens are kept in custom settings (tests.*) between statements: any role
-- can read and write those, unlike a table.

-- ---------------------------------------------------------------------
-- Creating
-- ---------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.create_invitation(tests.org_id('Org A'), 'elena@example.org', 'staff')$$,
  '42501', null,
  'anon cannot invite'
);

select tests.authenticate_as('bruno@example.org');
select throws_ok(
  $$select public.create_invitation(tests.org_id('Org A'), 'elena@example.org', 'staff')$$,
  '42501', 'insufficient_role',
  'staff cannot invite'
);

select tests.authenticate_as('carla@example.org');
select throws_ok(
  $$select public.create_invitation(tests.org_id('Org A'), 'elena@example.org', 'staff')$$,
  '42501', 'insufficient_role',
  'carla cannot invite to Org A'
);

select tests.authenticate_as('diego@example.org');
select throws_ok(
  $$select public.create_invitation(tests.org_id('Org A'), 'elena@example.org', 'owner')$$,
  'P0001', 'invalid_role',
  'nobody is invited as owner'
);
select throws_ok(
  $$select public.create_invitation(tests.org_id('Org A'), 'Bruno@Example.org', 'admin')$$,
  'P0001', 'already_member',
  'existing members are not invited again (case-insensitive)'
);

select set_config(
  'tests.first_token',
  public.create_invitation(tests.org_id('Org A'), '  Elena@Example.org ', 'staff'),
  true
);
select matches(
  current_setting('tests.first_token'),
  '^[0-9a-f]{64}$',
  'an admin creates an invitation and gets a 256-bit token'
);

-- Inviting the same email again replaces the open invitation.
select set_config(
  'tests.token',
  public.create_invitation(tests.org_id('Org A'), 'elena@example.org', 'staff'),
  true
);

select tests.as_admin();
select results_eq(
  $$select email, revoked_at is null from public.invitations
    where org_id = tests.org_id('Org A') order by created_at, revoked_at nulls last$$,
  $$values ('elena@example.org', false), ('elena@example.org', true)$$,
  'the email is normalized and re-inviting revokes the previous link'
);
select is_empty(
  $$select * from public.invitations
    where token_hash in (current_setting('tests.token'), current_setting('tests.first_token'))$$,
  'only the hash of the token is stored'
);

select throws_ok(
  $$insert into public.invitations (org_id, email, role, token_hash)
    values (tests.org_id('Org A'), 'x@example.org', 'owner', 'x')$$,
  '23514', null,
  'the table itself refuses owner invitations'
);

-- ---------------------------------------------------------------------
-- Reading and revoking
-- ---------------------------------------------------------------------
select tests.authenticate_as('ana@example.org');
select results_eq(
  $$select count(*) from public.invitations$$,
  array[2::bigint],
  'the owner sees the invitations of Org A'
);

select tests.authenticate_as('bruno@example.org');
select is_empty($$select * from public.invitations$$, 'staff cannot see invitations');

select tests.authenticate_as('carla@example.org');
select is_empty($$select * from public.invitations$$, 'carla cannot see Org A invitations');
select is_empty(
  $$update public.invitations set revoked_at = now() returning id$$,
  'carla cannot revoke Org A invitations'
);
select throws_ok(
  $$insert into public.invitations (org_id, email, role, token_hash)
    values (tests.org_id('Org B'), 'x@example.org', 'staff', 'x')$$,
  '42501', null,
  'invitations cannot be inserted directly'
);

select tests.authenticate_as('diego@example.org');
select throws_ok(
  $$update public.invitations set role = 'admin'$$,
  '42501', null,
  'only revoked_at is writable'
);

-- ---------------------------------------------------------------------
-- Previewing
-- ---------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$select * from public.get_invitation(current_setting('tests.token'))$$,
  '42501', null,
  'anon cannot preview invitations'
);

select tests.authenticate_as('carla@example.org');
select is_empty(
  $$select * from public.get_invitation('not-a-token')$$,
  'an unknown token returns nothing'
);
select results_eq(
  $$select org_name, role, status, email_matches
    from public.get_invitation(current_setting('tests.token'))$$,
  $$values ('Org A', 'staff'::public.member_role, 'pending', false)$$,
  'someone else sees the invitation does not match their email'
);

select tests.authenticate_as('elena@example.org');
select results_eq(
  $$select status, email_matches from public.get_invitation(current_setting('tests.token'))$$,
  $$values ('pending', true)$$,
  'the invitee sees a pending invitation for their email'
);
select results_eq(
  $$select status from public.get_invitation(current_setting('tests.first_token'))$$,
  array['revoked'],
  'a replaced link shows as revoked'
);

-- ---------------------------------------------------------------------
-- Accepting
-- ---------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.accept_invitation(current_setting('tests.token'))$$,
  '42501', null,
  'anon cannot accept invitations'
);

select tests.authenticate_as('carla@example.org');
select throws_ok(
  $$select public.accept_invitation(current_setting('tests.token'))$$,
  'P0001', 'invitation_email_mismatch',
  'a forwarded link does not work for another account'
);

select tests.authenticate_as('elena@example.org');
select throws_ok(
  $$select public.accept_invitation(current_setting('tests.first_token'))$$,
  'P0001', 'invitation_invalid',
  'a revoked link cannot be used'
);
select throws_ok(
  $$select public.accept_invitation('not-a-token')$$,
  'P0001', 'invitation_invalid',
  'an unknown token cannot be used'
);
select is(
  public.accept_invitation(current_setting('tests.token')),
  tests.org_id('Org A'),
  'the invitee accepts and gets the organization id'
);
select results_eq(
  $$select o.name, m.role from public.members m join public.organizations o on o.id = m.org_id
    where m.user_id = tests.user_id('elena@example.org')$$,
  $$values ('Org A', 'staff'::public.member_role)$$,
  'the invitee is now a member with the invited role'
);
select is(
  public.accept_invitation(current_setting('tests.token')),
  tests.org_id('Org A'),
  'accepting twice is harmless'
);

select tests.as_admin();
select tests.create_user('gema@example.org');
select tests.authenticate_as('gema@example.org');
select throws_ok(
  $$select public.accept_invitation(current_setting('tests.token'))$$,
  'P0001', 'invitation_invalid',
  'a used link cannot be reused by somebody else'
);

-- Expired invitation.
select tests.authenticate_as('ana@example.org');
select set_config(
  'tests.gema_token',
  public.create_invitation(tests.org_id('Org A'), 'gema@example.org', 'admin'),
  true
);
select tests.as_admin();
update public.invitations set expires_at = now() - interval '1 minute' where email = 'gema@example.org';

select tests.authenticate_as('gema@example.org');
select throws_ok(
  $$select public.accept_invitation(current_setting('tests.gema_token'))$$,
  'P0001', 'invitation_expired',
  'an expired link cannot be used'
);

-- Unconfirmed email: the address must be proven before joining.
select tests.as_admin();
update public.invitations set expires_at = now() + interval '1 day' where email = 'gema@example.org';
update auth.users set email_confirmed_at = null where email = 'gema@example.org';

select tests.authenticate_as('gema@example.org');
select throws_ok(
  $$select public.accept_invitation(current_setting('tests.gema_token'))$$,
  'P0001', 'invitation_email_mismatch',
  'an unconfirmed email cannot accept'
);

select tests.as_admin();
select is_empty(
  $$select * from public.members where user_id = tests.user_id('gema@example.org')$$,
  'gema never joined'
);

select * from finish();
rollback;
