import { Clock, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export const CourseCard = ({ course }) => (
  <Link
    to={`/courses/${course.slug}`}
    data-testid={`course-card-${course.slug}`}
    className="group flex items-start gap-4 rounded-2xl border border-brand-line bg-brand-surface p-6 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-brand-primary/50"
  >
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-elevated">
      <GraduationCap className="h-5 w-5 text-brand-accent2" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <h3 className="font-heading text-base font-semibold text-fg">{course.name}</h3>
      <p className="mt-1 text-xs text-muted">{course.short_name}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
        {course.course_type && (
          <span className="rounded-full border border-brand-line px-2.5 py-1">{course.course_type}</span>
        )}
        {course.duration && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {course.duration}
          </span>
        )}
      </div>
    </div>
  </Link>
);
