const LEGACY_TAG_INDEX_FIELDS = ["lectureId", "type"];
const OWNED_TAG_INDEX_FIELDS = ["UserId", "lectureId", "type"];
const OWNED_TAG_INDEX_NAME =
  "tags_and_bookmarks_user_lecture_type_unique";

const fieldsForIndex = (index) =>
  index.fields.map((field) => field.attribute || field.name);

const hasFields = (index, expected) => {
  const actual = fieldsForIndex(index);
  return (
    actual.length === expected.length &&
    expected.every((field, position) => actual[position] === field)
  );
};

export const migrateTagOwnershipIndex = async (
  queryInterface,
  tableName,
) => {
  let indexes = await queryInterface.showIndex(tableName);

  for (const index of indexes) {
    if (index.unique && hasFields(index, LEGACY_TAG_INDEX_FIELDS)) {
      await queryInterface.removeIndex(tableName, index.name);
    }
  }

  indexes = await queryInterface.showIndex(tableName);
  const hasOwnedIndex = indexes.some(
    (index) => index.unique && hasFields(index, OWNED_TAG_INDEX_FIELDS),
  );

  if (!hasOwnedIndex) {
    await queryInterface.addIndex(tableName, OWNED_TAG_INDEX_FIELDS, {
      name: OWNED_TAG_INDEX_NAME,
      unique: true,
    });
  }
};
