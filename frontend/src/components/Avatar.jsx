export default function Avatar({ user, size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-11 w-11 text-base',
    lg: 'h-20 w-20 text-3xl'
  };
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || '?';

  if (user?.profile_image_url) {
    return (
      <img
        src={user.profile_image_url}
        alt={`Foto de perfil de ${user?.name || 'usuário'}`}
        className={`${sizes[size]} rounded-full border border-ember/40 object-cover shadow-glow`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} grid place-items-center rounded-full border border-ember/40 bg-ember/15 font-display text-ember shadow-glow`}>
      {initial}
    </div>
  );
}
