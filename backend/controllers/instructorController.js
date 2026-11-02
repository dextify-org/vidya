import { Course, Instructor } from "../models/index.js";

const createInstructor = async (req, res) => {
  const { name } = req.body;
  try {
    await Instructor.create({ name });
    const instructors = await Instructor.findAll({
      include: [
        {
          model: Course,
          as: "courses",
          attributes: ["duration"],
        },
      ],
      raw: false,
    });

    const instructorsWithDuration = instructors.map((instructor) => {
      const instructorData = instructor.toJSON();
      const totalDuration = instructorData.courses.reduce((total, course) => {
        return total + (course.duration || 0);
      }, 0);
      instructorData.totalCourseDuration = totalDuration;
      return instructorData;
    });

    res.status(200).json(instructorsWithDuration);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create instructor" });
  }
};

const updateInstructor = async (req, res) => {
  const { name, instructorId } = req.body;
  try {
    await Instructor.update({ name }, { where: { id: instructorId } });

    const instructors = await Instructor.findAll({
      include: [
        {
          model: Course,
          as: "courses",
          attributes: ["duration"],
        },
      ],
      raw: false,
    });

    const instructorsWithDuration = instructors.map((instructor) => {
      const instructorData = instructor.toJSON();
      const totalDuration = instructorData.courses.reduce((total, course) => {
        return total + (course.duration || 0);
      }, 0);
      instructorData.totalCourseDuration = totalDuration;
      return instructorData;
    });

    res.status(200).json(instructorsWithDuration);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update instructor" });
  }
};

const deleteInstructor = async (req, res) => {
  const { instructorId } = req.body;
  try {
    const instructor = await Instructor.findByPk(instructorId);

    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    await Instructor.destroy({ where: { id: instructorId } });

    const instructors = await Instructor.findAll({
      include: [
        {
          model: Course,
          as: "courses",
          attributes: ["duration"],
        },
      ],
      raw: false,
    });

    const instructorsWithDuration = instructors.map((instructor) => {
      const instructorData = instructor.toJSON();
      const totalDuration = instructorData.courses.reduce((total, course) => {
        return total + (course.duration || 0);
      }, 0);
      instructorData.totalCourseDuration = totalDuration;
      return instructorData;
    });

    res.status(200).json(instructorsWithDuration);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete instructor" });
  }
};

const getAllInstructor = async (req, res) => {
  try {
    const instructors = await Instructor.findAll({
      include: [
        {
          model: Course,
          as: "courses",
          attributes: ["duration"],
        },
      ],
      raw: false,
    });

    const instructorsWithDuration = instructors.map((instructor) => {
      const instructorData = instructor.toJSON();
      const totalDuration = instructorData.courses.reduce((total, course) => {
        return total + (course.duration || 0);
      }, 0);
      instructorData.totalCourseDuration = totalDuration;
      return instructorData;
    });

    res.status(200).json(instructorsWithDuration);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const individualInstructor = async (req, res) => {
  const { InstructorId } = req.body;
  const role = req.user.role;
  try {
    const instructor = await Instructor.findByPk(InstructorId, {
      include: {
        model: Course,
        as: "courses",
        attributes: ["id", "photo", "cleanedName", "duration"],
      },
      attributes: ["name", "description", "id", "photo"],
    });

    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    const instructorData = instructor.toJSON();
    const totalDuration = instructorData.courses.reduce((total, course) => {
      return total + (course.duration || 0);
    }, 0);
    instructorData.totalCourseDuration = totalDuration;

    res.status(200).json({ ...instructorData, role });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

export {
  createInstructor,
  updateInstructor,
  deleteInstructor,
  getAllInstructor,
  individualInstructor,
};
