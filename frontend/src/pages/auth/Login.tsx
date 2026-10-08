export default function Login() {
  return (
    <div className="max-w-md mx-auto bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 mt-6">
      <div className="mb-6">
        <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Login</span>
        <h1 className="text-2xl font-bold text-neutral-900 mt-1">Sign in to ClubOS</h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="email@example.com"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800 transition-colors mt-2"
        >
          Login
        </button>
      </form>
    </div>
  );
}
