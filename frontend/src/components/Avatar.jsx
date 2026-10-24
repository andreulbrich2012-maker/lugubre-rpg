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
        className={`${sizes[size]} border-[3px] border-lead object-cover`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} grid place-items-center border-[3px] border-lead lit font-display text-ember`}>
      {initial}
    </div>
  );
}
