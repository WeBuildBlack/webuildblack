import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const COURSES_DIR = path.join(process.cwd(), 'courses');

export interface CourseModule {
  id: string;
  title: string;
  estimatedMinutes: number;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  slug: string;
  title: string;
  estimatedMinutes?: number;
  isFreePreview?: boolean;
}

export interface CourseData {
  title: string;
  slug: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  prerequisites: string[];
  modules: CourseModule[];
  priceCents?: number;
  stripePriceId?: string;
  author: string;
  updatedAt: string;
}

export function getAllCourses(): CourseData[] {
  const courseDirs = fs.readdirSync(COURSES_DIR).filter((dir) => {
    const fullPath = path.join(COURSES_DIR, dir);
    return (
      fs.statSync(fullPath).isDirectory() &&
      dir !== 'templates' &&
      fs.existsSync(path.join(fullPath, 'course.json'))
    );
  });

  return courseDirs.map((dir) => getCourse(dir)).filter(Boolean) as CourseData[];
}

export function getCourse(slug: string): CourseData | null {
  const courseJsonPath = path.join(COURSES_DIR, slug, 'course.json');

  if (!fs.existsSync(courseJsonPath)) return null;

  const raw = fs.readFileSync(courseJsonPath, 'utf-8');
  const data = JSON.parse(raw);

  // Enrich modules with lessons from filesystem
  const modulesDir = path.join(COURSES_DIR, slug, 'modules');
  const modules: CourseModule[] = (data.modules || []).map((mod: any) => {
    const moduleDir = path.join(modulesDir, mod.id);
    const lessons = getLessonsForModule(moduleDir, mod.id);
    return {
      id: mod.id,
      title: mod.title,
      estimatedMinutes: mod.estimatedMinutes || 0,
      lessons,
    };
  });

  return {
    title: data.title,
    slug: data.slug || slug,
    description: data.description || '',
    difficulty: data.difficulty || 'beginner',
    estimatedHours: data.estimatedHours || 0,
    prerequisites: data.prerequisites || [],
    modules,
    priceCents: data.priceCents,
    stripePriceId: data.stripePriceId,
    author: data.author || 'We Build Black',
    updatedAt: data.updatedAt || '',
  };
}

function getLessonsForModule(moduleDir: string, moduleId: string): CourseLesson[] {
  const lessonPath = path.join(moduleDir, 'lesson.md');
  if (fs.existsSync(lessonPath)) {
    // Single lesson module (existing course format)
    const content = fs.readFileSync(lessonPath, 'utf-8');
    const { data } = matter(content);
    return [
      {
        slug: 'lesson',
        title: data.title || moduleId,
        estimatedMinutes: data.estimatedMinutes,
        isFreePreview: data.isFreePreview || false,
      },
    ];
  }

  // Multi-lesson module (new course format with lessons/ subdir)
  const lessonsDir = path.join(moduleDir, 'lessons');
  const lessons: CourseLesson[] = [];

  if (fs.existsSync(lessonsDir)) {
    const lessonFiles = fs.readdirSync(lessonsDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    for (const file of lessonFiles) {
      const content = fs.readFileSync(path.join(lessonsDir, file), 'utf-8');
      const { data } = matter(content);
      const slug = file.replace('.md', '');
      lessons.push({
        slug,
        title: data.title || slug,
        estimatedMinutes: data.estimatedMinutes,
        isFreePreview: data.isFreePreview || false,
      });
    }
  }

  // Append module project if it exists
  const projectPath = path.join(moduleDir, 'project.md');
  if (fs.existsSync(projectPath)) {
    const content = fs.readFileSync(projectPath, 'utf-8');
    const { data } = matter(content);
    lessons.push({
      slug: 'project',
      title: data.title || 'Module Project',
      estimatedMinutes: data.estimatedMinutes || 75,
      isFreePreview: false,
    });
  }

  return lessons;
}

export function getLessonContent(
  courseSlug: string,
  moduleId: string,
  lessonSlug: string
): { content: string; frontmatter: Record<string, any> } | null {
  // Check for single lesson format first
  if (lessonSlug === 'lesson') {
    const singlePath = path.join(COURSES_DIR, courseSlug, 'modules', moduleId, 'lesson.md');
    if (fs.existsSync(singlePath)) {
      const raw = fs.readFileSync(singlePath, 'utf-8');
      const { content, data } = matter(raw);
      return { content, frontmatter: data };
    }
  }

  // Check for module project
  if (lessonSlug === 'project') {
    const projectPath = path.join(COURSES_DIR, courseSlug, 'modules', moduleId, 'project.md');
    if (fs.existsSync(projectPath)) {
      const raw = fs.readFileSync(projectPath, 'utf-8');
      const { content, data } = matter(raw);
      return { content, frontmatter: data };
    }
  }

  // Multi-lesson format
  const lessonPath = path.join(
    COURSES_DIR,
    courseSlug,
    'modules',
    moduleId,
    'lessons',
    `${lessonSlug}.md`
  );

  if (!fs.existsSync(lessonPath)) return null;

  const raw = fs.readFileSync(lessonPath, 'utf-8');
  const { content, data } = matter(raw);
  return { content, frontmatter: data };
}

export function getQuiz(
  courseSlug: string,
  moduleId: string
): any | null {
  const quizPath = path.join(COURSES_DIR, courseSlug, 'modules', moduleId, 'quiz.json');
  if (!fs.existsSync(quizPath)) return null;

  const raw = fs.readFileSync(quizPath, 'utf-8');
  return JSON.parse(raw);
}
