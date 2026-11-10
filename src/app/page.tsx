import "./(public)/camelot-site.css";
import { CamelotExperience } from "@/components/layout/camelot-experience";

export default function HomePage() {
  return (
    <div className="camelot-home">
      <CamelotExperience />
    </div>
  );
}
