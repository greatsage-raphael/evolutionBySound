import Link from 'next/link';
import { UserNav } from './UserNav';
import { currentUser } from '@clerk/nextjs/server';
import { FileText } from 'lucide-react';

export default async function Header() {
  const user = await currentUser();
  return (
    <div className="bg-zinc-700 container relative m-0 mx-auto py-2 md:px-0">
      <div className="max-width flex items-center justify-between text-black">
        {/* logo */}
        <Link className="flex w-fit items-center gap-[2px]" href="/">
          <h1 className="text-xl font-semibold text-white">Life EXP</h1>
        </Link>
        {/* buttons */}
        <div className="flex w-fit items-center gap-[22px]">
          {user ? (
            <>
              <UserNav
                image={user.imageUrl}
                name={user.firstName + ' ' + user.lastName}
                email={
                  user.emailAddresses.find(
                    ({ id }) => id === user.primaryEmailAddressId,
                  )!.emailAddress
                }
              />
            </>
          ) : (
            <Link href="/upload">
              <button className="text-md primary-gradient primary-shadow rounded-lg px-5 py-1 text-center text-light md:px-10 md:py-2 md:text-xl">
                Sign in
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}