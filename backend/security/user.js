const SAFE_USER_FIELDS = [
  "id",
  "username",
  "role",
  "featuredCourse",
  "deflang",
];

export const toSafeUser = (user) => {
  if (!user) return null;

  const plainUser =
    typeof user.get === "function" ? user.get({ plain: true }) : user;

  return Object.fromEntries(
    SAFE_USER_FIELDS.filter((field) => plainUser[field] !== undefined).map(
      (field) => [field, plainUser[field]],
    ),
  );
};
