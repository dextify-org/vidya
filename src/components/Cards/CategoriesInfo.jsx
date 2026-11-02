import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "../../api/axiosInstance";
import { DotsVerticalRounded } from "../../assets";

const CategoriesInfo = ({
  name,
  categoryId,
  setCategoriesList,
  setCategoryNeedsUpdate,
  categoryNeedsUpdate,
  setShowToast,
  setToastMessage,
  setToastType,
  isAdmin,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [categoryInput, setCategoryInput] = useState(name);
  const navigate = useNavigate();

  const handleCategory = (categoryId) => {
    navigate(`/category/${categoryId}`);
  };

  const updateCategoryBackend = async (category) => {
    try {
      const categories = await axios.post(
        "/api/admin/update-category",
        category,
        {
          withCredentials: true,
        }
      );
      return categories;
    } catch (error) {
      console.error(error);
    }
  };

  const deleteCategoryBackend = async (id) => {
    try {
      const response = await axios.post(
        "/api/admin/delete-category",
        { categoryId: id },
        {
          withCredentials: true,
        }
      );
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleUpdateCategory = async () => {
    setShowToast(false);
    if (categoryInput.trim()) {
      const newCategory = {
        name: categoryInput.trim(),
        categoryId: categoryId,
      };
      setToastType("warning");
      setToastMessage("Updating category");
      setShowToast(true);
      const category = await updateCategoryBackend(newCategory);

      setToastType("success");
      setToastMessage("Category updated");
      setShowToast(true);
      setIsModalOpen(false);
      setCategoryNeedsUpdate(categoryNeedsUpdate + 1);
      setCategoriesList(category.data);
    } else {
      setToastType("error");
      setToastMessage("Name can't be empty when updating category");
      setShowToast(true);
    }
  };

  const handleDeleteCategory = async () => {
    setShowToast(false);
    try {
      setToastType("warning");
      setToastMessage("Deleting category");
      setShowToast(true);

      const category = await deleteCategoryBackend(categoryId);

      setToastType("success");
      setToastMessage("Category deleted successfully");
      setShowToast(true);
      setIsDeleteModalOpen(false);
      setCategoryNeedsUpdate(categoryNeedsUpdate + 1);
      setCategoriesList(category.data);
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to delete category");
      setShowToast(true);
    }
  };

  return (
    <>
      <div onClick={() => handleCategory(categoryId)} className="categories">
        {name}
        {isAdmin && (
          <div
            className="edit-category"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
          >
            <DotsVerticalRounded />
          </div>
        )}
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal small-medium-modal">
            <div className="add-user-modal">
              <div className="modal-heading">Update Category</div>
              <input
                type="text"
                className="input"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
              />
              <div className="modal-buttons-group-user">
                <div
                  className="modal-buttons"
                  style={{
                    backgroundColor: "#00a6a6",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={handleUpdateCategory}
                >
                  Update
                </div>
                <div
                  className="modal-buttons"
                  style={{
                    backgroundColor: "#e20044",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                >
                  Delete
                </div>
                <div
                  className="modal-buttons"
                  style={{ color: "#45312d" }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal small-medium-modal">
            <div className="add-user-modal">
              <div className="modal-heading">Delete Confirmation</div>
              <p>Are you sure you want to delete "{name}"?</p>
              <div className="modal-buttons-group-user">
                <div
                  className="modal-buttons"
                  style={{
                    backgroundColor: "#e20044",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={handleDeleteCategory}
                >
                  Yes
                </div>
                <div
                  className="modal-buttons"
                  style={{ color: "#45312d", cursor: "pointer" }}
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  No
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoriesInfo;
